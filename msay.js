const fs = require( 'fs' );
// const minimist = require( 'minimist' );

function parsePhrases( data ) {
  const raw = data.toString ? data.toString() : data;
  return raw.split( '\n\n' );
}

function main() {
  fs.readFile( './machine.txt', ( err, data ) => {
    if ( err ) {
      console.error( err );
    }

    const phrases = parsePhrases( data );
    console.log( phrases );
  } );
}

main();
