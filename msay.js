const fs = require( 'fs' );
const minimist = require( 'minimist' );
const shellescape = require( 'shell-escape' );
const spawn = require( 'child_process' ).spawn;
const keypress = require( 'keypress' );
const term = require( 'terminal-kit' ).terminal;

function quitCauseError( code, error ) {
  console.error( `Error code ${ code }` );
  console.error( error );
  process.exit( 1 );
}

function quitCauseInvalidArguments( code ) {
  quitCauseError(
    code,
    `Use this command like this:\n$  msay script.txt [phraseNum] [options]`
  );
}

function quitCauseFileNotFound( fileName ) {
  quitCauseError(
    3,
    `\`${ fileName }\` is not a file or doesn't exist`
  );
}

function quitCausePhraseNotFound() {
  quitCauseError(
    4,
    `The given phraseNum doesn't exist`
  );
}

function checkArguments( argv ) {
  !argv._ || !argv._.length && quitCauseInvalidArguments( -1 );
  if ( !argv.i ) {
    argv._.length !== 2 && quitCauseInvalidArguments( -2 );
  }
  else {
    argv._.length < 1 && quitCauseInvalidArguments( -2.1 );
  }

  const fileName = argv._[ 0 ];
  const phraseNum = parseInt( argv._[ 1 ] );

  return {
    fileName,
    phraseNum,
  };
}

function checkIfFileExists( fileName ) {
  return new Promise( ( resolve ) => {
    try {
      fs.stat( fileName, ( err, stat ) => {
        if ( err || !stat.isFile() ) {
          return quitCauseFileNotFound( fileName );
        }

        return resolve( fileName );
      } );
    }
    catch ( e ) {
      return quitCauseFileNotFound( fileName );
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
  !phrases[ index ] && quitCausePhraseNotFound();
  return phrases[ index ];
}

function verboseOut( phrase, phraseNum, phraseCount ) {
  console.log( `Playing ${ phraseNum }/${ phraseCount }` );
  return phrase;
}

function sayPhrase( phrase ) {
  return new Promise( ( resolve ) => {
    const childProcess = spawn( 'say', [
      '-v', 'Daniel',
      '-r', '150',
      '-i',
      shellescape( [ phrase ] )
    ], {
      shell: true,
      stdio: 'inherit'
    } );

    childProcess.on( 'close', () => {
      resolve();
    } );
  } );
}

function initialSetup( fileName ) {
  return checkIfFileExists( fileName )
    .then( readFile )
    .then( parsePhrases )
}

function defaultMode( fileName, phraseNum ) {
  let phraseCount = 0;

  initialSetup( fileName )
    .then( ( phrases ) => {
      phraseCount = phrases.length;
      return phrases;
    } )
    .then( ( phrases ) => getPhrase( phrases, phraseNum ) )
    .then( ( singlePhrase ) => verboseOut( singlePhrase, phraseNum, phraseCount ) )
    .then( sayPhrase );
}

function interactiveWrite( phrases, phrasePos, playing = false ) {
  term.clear();
  term( 'Position ' );
  term.bold.cyan( phrasePos );
  term( `/${ phrases.length }\n` );

  const phrase = phrases[ phrasePos - 1 ];
  if ( !playing ) {
    term.bgGray.white( phrase );
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

function interactiveControl( key, phrases, phrasePos ) {
  let newPhrasePos = phrasePos;
  let playing = false;

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
    playing = sayPhrase( phrases[ phrasePos - 1 ] );
  }

  return [ newPhrasePos, playing ];
}

function interactiveMode( fileName ) {
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

        const result = interactiveControl( key, phrases, phrasePos );
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

    } );
}

function main() {
  const argv = minimist( process.argv.slice( 2 ) );
  const { fileName, phraseNum } = checkArguments( argv );

  if ( !argv.i ) {
    defaultMode( fileName, phraseNum );
  }
  else {
    interactiveMode( fileName );
  }
}

main();
