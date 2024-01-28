// remove and adds screenshare and my video camj
handleVideoPinUnpin



todo: 
= input location
2. implement properties api on the server   
3. once we have the user's location, we pull properties json and transform it to a new array, sorted as nearest to furtherst. 
4. init display mode to me and to the peer:
    - download images of the first property and start carousel
    - start carousel on the peer front, send an array of currently selected property images to the peer via socket.
    - show carousel to the peer
5. Operator can click "next property"
    - feed new images to the carousel
    - send next property id and it's images url to the peer.
    - feed new images to the peer carousel

** Carousel
25 images of 5 properties to be cycled.  



### TODO: 
- [ ] check we handle errors on server
- [ ] add js doc to functions, ex warning that fetch functions return promises


emitPeerStatus ?
emitPeerAction ?



resizeVideoMedia() - to resize cameras in videoMediaContainer
☑️


toggleScreenSharing() - container toggle
mention i opted not to use local variables as fn arguments because it's already polluted global space
more consistent way to log error, that just console.log?

when unpin i need to resize Camera el w/h in px?

TODO: check if we need this :
`const CAROUSEL_GROUP_IMAGE_BATCH_SIZE = 5;`


todo: 
- stop display mode on peer
- hide controls on peer