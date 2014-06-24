Svallet
==========

Tired of jumping from site to site to figure out the state of your cryptoassets? So are we!

The svallet is an entirely new kind of wallet. Rather than maintaining all of your data itself, the svallet knows where that data is held by others, compiles it and shows it to you in a concise, easy-to-understand format. Nothing to install if you run from svallet.info, and no blockchain to sync and parse if you install it yourself from here!

Note that this repo contains the UI code, while the core library contains the actual queries: https://github.com/curtislacy/svallet-core

Like this? Help me keep it going! 1Lhx85xtTjDTXHgXPVCBnBeJotG4kU5eK3

Signing with your PGP key
==========

Signing your commits with a PGP key is always appreciated. 

1. Generate a key: http://stackoverflow.com/a/16725717/364485 
2. Sign your commit: `git commit -S` (Works for merges too, don't need to sign every commit, just the last one before you push something up. 
3. Check the signature on your commit: `git log --show-signature`
4. You may not have all the contributor's public keys, to verify.  Most of them will be willing to send you either their key or its hash if you contact them (and contacting them is the best way to be sure you get the right one), then you can import it into your GPG client.  For example, to get mine (https://github.com/curtislacy), `gpg --recv-key 2A79E3932902383C`