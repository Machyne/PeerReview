PeerReview
==========

There are many implementations of real-time concurrent editors, the most well-known of which may be Google Drive—but much less work has been done on an implementation over a peer-to-peer network. We built such an implementation over the Ace web code editor with peer.js and ot.js. Operational transformation libraries, now a standard part of RTCEs, generally require a server, but we were able to appropriate ot.js for P2P with the work divided evenly among the peers. Our design is scalable to many users. Our coding work was all done during the Yahoo! Hack.
