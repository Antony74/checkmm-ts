# checkmm-ts

Metamath database verifier.

This is a standalone verifier for Metamath database files (which are typically suffixed with the '.mm' file extension).

Start by obtaining a .mm file from somewhere, e.g.

```
curl https://raw.githubusercontent.com/metamath/set.mm/develop/set.mm -o set.mm
```

This single filename is the only parameter checkmm takes, so the following command will verify set.mm

```
npx checkmm set.mm
```

To do this more than a handful of times it is more efficient to install checkmm.

```
npm install --global checkmm
checkmm set.mm
```

We can also add checkmm to an existing npm project

```
npm install checkmm
```

There are module exports which should make checkmm easy and fun to hack, but bear in mind it was not originally written with the intention of being used as a library.

# History

For general information about Metamath please see http://us.metamath.org

This is a port to TypeScript. The original C++ program was written by Eric Schmidt and can be found here:

http://us.metamath.org/other.html#checkmm

# License

This code is public domain ([Creative Commons "CC0 1.0 Universal"](http://creativecommons.org/publicdomain/zero/1.0/))
