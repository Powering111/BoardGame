const http = require('http');
const express = require('express');
const websocket = require('ws');
const Game = require('./game.js');

const app = express();
const server = http.createServer(app);

const wss = new websocket.Server({server});

app.use('/', express.static('static'));

const waiter = []
const ID = {
    user: 0,
    room: 0,
};

function start_match(ws1, ws2, game){
    ws1.send(JSON.stringify({
        type:'match_start',
        board: 1,
    }));
    ws2.send(JSON.stringify({
        type:'match_start',
        board: 2,
    }));

    console.log(`match start U${ws1.id} vs U${ws2.id} : R${ID.room}`);
    ws1.room = ID.room;
    ws1.game = game;
    ws1.board = 1;
    ws1.opponent = ws2;
    ws2.room = ID.room;
    ws2.game = game;
    ws2.board = 2;
    ws2.opponent = ws1;
    ID.room++;

    send_update(ws1, ws2, game);
}

function send_update(ws1, ws2, game){
    let flag=false;
    if((ws1!=null && ws1.board==1) ||
        (ws1==null && ws2!=null && ws2.board==2)){
        flag = true;
    }

    const board1 = flag ? game.board1.pack() : game.board2.pack();
    const board2 = flag ? game.board2.pack() : game.board1.pack();

    if(ws1!=null && ws1.readyState == WebSocket.OPEN){
        ws1.send(JSON.stringify({
            type: 'update_board',
            board1: board1,
            board2: board2,
        }));
        if(game.over){
            ws1.send(JSON.stringify({
                type: 'match_over',
                winner: game.winner
            }));
        }
    }
    if(ws2!=null && ws2.readyState == WebSocket.OPEN){
        ws2.send(JSON.stringify({
            type: 'update_board',
            board1: board2,
            board2: board1,
        }));
        if(game.over){
            ws2.send(JSON.stringify({
                type: 'match_over',
                winner: game.winner,
            }));
        }
    }
}

wss.on('connection', (ws, req) => {
    console.log("connected to",req.socket.remoteAddress);

    ws.id = ID.user;
    ID.user++;

    ws.on('error', console.error);
    
    ws.on('close', (code, reason) => {
        console.log(`closing ${ws.id} : ${code}, ${reason}`);
        if(waiter.length>0 && Object.is(ws,waiter[0])){
            // was waiting
            waiter.pop();
        }
        else if(ws.room != null){
            if(!ws.game.over){
                ws.game.finish(ws.opponent.board);
                send_update(ws, ws.opponent, ws.game);
            }
        }
    });

    ws.on('message', (raw_data)=>{
        const data = JSON.parse(raw_data);
        console.log(`U${ws.id} : `, data);
        if(ws.room != null){
            // gaming
            const game = ws.game;
            const opponent = ws.opponent;

            if(!game.over){
                if(data.type=='reveal'){
                    game.reveal(ws.board, new Game.Index(data.row, data.column));
                }
                else if(data.type=='flag'){
                    game.flag(ws.board, new Game.Index(data.row, data.column));
                }

                send_update(ws, opponent, game);
            }
        }
        else if(!ws.joining){
            if(data.type=='join'){
                if(waiter.length > 0){
                    // match with existing waiter
                    /** @type {WebSocket} */
                    const opponent = waiter.pop();
                    const game = new Game.Game(ws, opponent);
                    start_match(ws, opponent, game);
                }
                else{
                    // wait
                    ws.joining = true;
                    waiter.push(ws);
                }
            }
        }

    })

    ws.send(JSON.stringify({a:'asdf'}))
});




server.listen(8080);