const fs = require( 'fs' );
const minimist = require( 'minimist' );
const shellescape = require( 'shell-escape' );
const spawn = require( 'child_process' ).spawn;
const keypress = require( 'keypress' );
const term = require( 'terminal-kit' ).terminal;

function sayPhrase( phrase, voice = '', quiet = false ) {
  let args = [
    '-r', '150',
    shellescape( [ phrase ] )
  ];
  if ( !quiet ) {
    args.unshift( '-i' );
  }
  if ( voice ) {
    args.unshift( '-v', voice );
  }

  return new Promise( ( resolve ) => {
    const childProcess = spawn( 'say', args, {
      shell: true,
      stdio: 'inherit'
    } );

    childProcess.on( 'close', () => {
      resolve();
    } );
  } );
}

function quitCauseError( code, error ) {
  const errorMessage = `Error ${ code }!\n${ error }`;
  console.error( errorMessage );
  sayPhrase( errorMessage, '', true ).then( () => process.exit( 1 ) );
  return false;
}

function quitCauseInvalidArguments( code ) {
  return quitCauseError(
    code,
    'Invalid arguments!\n' +
    'Use this command like this:\n' +
    '  msay filename [index] [options]\n\n' +

    'Options are:\n' +
    '  -i    - Interactive mode.\n' +
    '  -v    - Voice.'
  );
}

function quitCauseFileNotFound( fileName ) {
  return quitCauseError(
    -3,
    `\`${ fileName }\` is not a file or doesn't exist`
  );
}

function quitCausePhraseNotFound() {
  return quitCauseError(
    -4,
    `The given index doesn't exist`
  );
}

function checkArguments( argv ) {
  if ( !argv._ || !argv._.length ) {
    return quitCauseInvalidArguments( -1 );
  }
  if ( !argv.i && argv._.length !== 2 ) {
    return quitCauseInvalidArguments( -2 );
  }
  else if ( argv.i && argv._.length < 1 ) {
    return quitCauseInvalidArguments( -2.1 );
  }

  const fileName = argv._[ 0 ];
  const phraseNum = parseInt( argv._[ 1 ] );

  return {
    fileName,
    phraseNum,
  };
}

function checkIfFileExists( fileName ) {
  return new Promise( ( resolve, reject ) => {
    try {
      fs.stat( fileName, ( err, stat ) => {
        if ( err || !stat.isFile() ) {
          return reject( quitCauseFileNotFound( fileName ) );
        }

        return resolve( fileName );
      } );
    }
    catch ( e ) {
      return reject( quitCauseFileNotFound( fileName ) );
    }
  } );
}

function readFile( fileName ) {
  return new Promise( ( resolve, reject ) => {
    fs.readFile( fileName, ( err, data ) => {
      if ( err ) {
        return reject( err );
      }

      resolve( data.toString() );
    } );
  } );
}

function parsePhrases( data ) {
  const raw = data.toString ? data.toString() : data;
  return raw.split( '\n\n' ).map( phrase => phrase.trim() );
}

function getPhrase( phrases, phraseNum ) {
  const index = phraseNum - 1;
  if ( !phrases[ index ] ) {
    quitCausePhraseNotFound();
    throw new Error( 'Phrase does not exist' );
  }
  return phrases[ index ];
}

function verboseOut( phrase, phraseNum, phraseCount ) {
  console.log( `Playing ${ phraseNum }/${ phraseCount }` );
  return phrase;
}

function initialSetup( fileName ) {
  return checkIfFileExists( fileName )
    .then( readFile )
    .then( parsePhrases )
}

function defaultMode( fileName, phraseNum, voice ) {
  let phraseCount = 0;

  initialSetup( fileName )
    .then( ( phrases ) => {
      phraseCount = phrases.length;
      return phrases;
    } )
    .then( ( phrases ) => getPhrase( phrases, phraseNum ) )
    .then( ( singlePhrase ) => verboseOut( singlePhrase, phraseNum, phraseCount ) )
    .then( ( singlePhrase ) => sayPhrase( singlePhrase, voice ) )
    .catch( () => {} );
}

function interactiveWrite( phrases, phrasePos, playing = false ) {
  term.clear();
  term.gray( 'Position ' );
  term.bold.white( phrasePos );
  term.gray( `/${ phrases.length }\n` );

  const phrase = phrases[ phrasePos - 1 ];
  if ( !playing ) {
    term.white( phrase );
  }
}

function sanitizePos( phrases, phrasePos ) {
  if ( !phrasePos || phrasePos < 1 ) {
    return 1;
  }
  else if ( phrasePos > phrases.length ) {
    return phrases.length;
  }

  return phrasePos;
}

function interactiveControl( key, phrases, phrasePos, voice ) {
  let newPhrasePos = phrasePos;
  let playing = false;

  if ( !key ) {
    return [ newPhrasePos, playing ];
  }

  if ( key.name === 'right' || key.name === 'up' ) {
    newPhrasePos += 1;
  }
  else if ( key.name === 'left' || key.name === 'down' ) {
    newPhrasePos -= 1;
  }
  else if ( key.name === 'return' ) {
    playing = true;
  }

  newPhrasePos = sanitizePos( phrases, newPhrasePos );
  interactiveWrite( phrases, newPhrasePos, playing );

  if ( key.name === 'return' ) {
    playing = sayPhrase( phrases[ phrasePos - 1 ], voice );
  }

  return [ newPhrasePos, playing ];
}

function interactiveMode( fileName, voice ) {
  let phrasePos = 1;
  let phrases = [];
  let playing = false;

  initialSetup( fileName )
    .then( ( _phrases ) => {
      phrases = _phrases;
    } )
    .then( () => {

      const stdin = process.stdin;
      keypress( stdin );
      stdin.setRawMode( true );
      stdin.resume();
      stdin.setEncoding( 'utf8' );

      interactiveWrite( phrases, phrasePos );
      stdin.on( 'keypress', function( ch, key ) {
        if ( key && key.ctrl && key.name == 'c' ) {
          process.stdin.pause();
        }

        if ( playing ) {
          return;
        }

        const result = interactiveControl( key, phrases, phrasePos, voice );
        const _playing = result[ 1 ];
        phrasePos = result[ 0 ];

        if ( _playing ) {
          playing = true;
          _playing.then( () => {
            playing = false;
            interactiveWrite( phrases, phrasePos );
          } );
        }
      } );

    } )
    .catch( () => {} );
}

function main() {
  const argv = minimist( process.argv.slice( 2 ) );
  const result = checkArguments( argv );
  if ( !result ) {
    return;
  }

  const { fileName, phraseNum } = result;
  const voice = argv.v ? argv.v : '';

  if ( !argv.i ) {
    defaultMode( fileName, phraseNum, voice );
  }
  else {
    interactiveMode( fileName, voice );
  }
}

main();
