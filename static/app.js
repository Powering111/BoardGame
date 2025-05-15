'use strict';

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});



(async function () {
    const ws = new WebSocket(`ws://${location.host}`);
    let matching = false;

    ws.addEventListener('open', (event) => {
        console.log("connected ", event);
    });
    ws.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if(data.type=='match_start'){
            if(!matching){
                matching = true;

                const game = new Game(ws, images, data.board);
                game.start();
            }
        }
    });

    console.log("loading textures...")
    const sources = ['0','1','2','3','4','5','6','7','8','mine','flag','hidden'];
    const images = await Promise.all(
        sources.map((_, index, array) => {
            return new Promise((resolve, reject)=>{
                if(!sources[index]) {
                    return resolve(null);
                }

                const img = new Image();
                img.addEventListener('load', () => {
                    // Now that the image has loaded make copy it to the texture.
                    resolve(img);
                });
                img.addEventListener('error', ()=>{
                    console.log("error loading texture");
                    resolve(null);
                });
                
                img.src = `res/${sources[index]}.svg`
            })
        })
    );
    console.log(images);
    console.log("loading textures... done!");


    // join
    ws.send(JSON.stringify({
        type: 'join'
    }));
})();    
