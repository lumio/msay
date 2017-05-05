const fs = require( 'fs' );
const minimist = require( 'minimist' );
const shellescape = require( 'shell-escape' );
const spawn = require( 'child_process' ).spawn;

function quitCauseError( code, error ) {
  console.error( `Error code ${ code }` );
  console.error( error );
  process.exit( 1 );
}

function quitCauseInvalidArguments( code ) {
  quitCauseError(
    code,
    `Use like this:\n$  msay script.txt phraseNum`
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
  argv._.length !== 2 && quitCauseInvalidArguments( -2 );
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
  return raw.split( '\n\n' );
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
  spawn( 'say', [
    '-v', 'Daniel',
    '-r', '150',
    '-i',
    phrase
  ], {
    shell: true,
    stdio: 'inherit'
  } );
}

function initialSetup( fileName ) {
  return checkIfFileExists( fileName )
    .then( readFile )
    .then( parsePhrases )
}

function main() {
  const argv = minimist( process.argv.slice( 2 ) );
  const { fileName, phraseNum } = checkArguments( argv );
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

main();
