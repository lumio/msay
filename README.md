msay
====

This is just me playing around with the `say` command from mac OS.

![msay](https://i.imgur.com/JppAPHJ.gif)

---

**tl;dr**

After `pnpm i` or `yarn` or `npm i`:

- `./msay textfile.txt 1 -v Bruce`
- `./msay textfile.txt -i`

---

I'm going to convert this into a read node module in the near future. For now this works something like this:

Installing and running msay
---------------------------

1. Clone and install dependencies:  
   `pnpm i` or `yarn` or `npm i`
2. Create a text file (see schema down below)
3. Run script like `./msay textfile.txt -i` for interactive mode or specify the phrase index like so `./msay textfile.txt 2`

Textfile "schema"
-----------------

Well, it is quite easy. Each phrase is separated by 2 line breaks:

```
Phrase 1

Phrase 2

and so on
```

Requirements
------------

This runs on mac OS out of the box.
