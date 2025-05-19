'use strict';

/** @param {HTMLElement} element */
function hide_element(element){
    element.style.display = 'none';
}

/** @param {HTMLElement} element */
function show_element(element){
    element.style.display = '';
}

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});


const JoinStatus = Object.freeze({
    IDLE: 0,
    MATCHING: 1,
    PLAYING: 2,
});

const start_btn_elem = document.getElementById('start_btn');
const leave_btn_elem = document.getElementById('leave_btn');
const lobby_elem = document.getElementById('lobby');
const game_elem = document.getElementById('game');

let join_status = JoinStatus.IDLE;


(async function () {
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



    const ws = new WebSocket(`ws://${location.host}`);

    /** @type {Game} */
    let game;

    function join_match(){
        ws.send(JSON.stringify({
            type: 'join'
        }));
        start_btn_elem.classList.add('matching');
        start_btn_elem.innerText = "Finding opponent";
        join_status = JoinStatus.MATCHING;
    }
    function leave_match(){
        ws.send(JSON.stringify({
            type: 'leave'
        }));
        start_btn_elem.classList.remove('matching');
        start_btn_elem.innerText = "Start";
        join_status = JoinStatus.IDLE;
    }
    
    function handle_start_game(board){
        if(game==null){
            game = new Game(ws, images, board);
            game.start();
        }
        else{
            game.reset();
        }
        join_status = JoinStatus.PLAYING;
        hide_element(lobby_elem);
        show_element(game_elem);
    }
    
    function leave_game(){
        ws.send(JSON.stringify({
            type: 'leave'
        }));
        join_status = JoinStatus.IDLE;
        start_btn_elem.classList.remove('matching');
        start_btn_elem.innerText = "Start";
        hide_element(game_elem);
        show_element(lobby_elem);
    }

    ws.addEventListener('open', (event) => {
        console.log("connected ", event);

        ws.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            if(join_status==JoinStatus.MATCHING){
                if(data.type=='match_start'){
                    handle_start_game(data.board);
                }
            }
            if(join_status==JoinStatus.PLAYING){
                if(data.type == 'update_board'){
                    game.update_board(data.board1, data.board2);
                }
                else if(data.type == 'match_over'){
                    game.finish(data.winner);
                }
            }
        });

        start_btn_elem.addEventListener('mousedown',(e)=>{
            if(join_status==JoinStatus.IDLE){
                join_match();
            }
            else if(join_status==JoinStatus.MATCHING){
                leave_match();
            }
        });
        leave_btn_elem.addEventListener('click',(e)=>{
            leave_game();
        });
    });

    ws.addEventListener('close', (event)=>{
        alert('connection with server closed.');
    });
})();