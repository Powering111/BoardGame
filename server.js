const http = require('http');
const express = require('express');
const websocket = require('ws');
const Game = require('./game.js');

const app = express();
const server = http.createServer(app);

const wss = new websocket.Server({server});

app.use('/', express.static('static'));

const JoinStatus = Object.freeze({
    IDLE: 0,
    MATCHING: 1,
    PLAYING: 2,
});

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

    ws1.join_status = JoinStatus.PLAYING;
    ws2.join_status = JoinStatus.PLAYING;

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
            ws1.join_status = JoinStatus.IDLE;
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
            ws2.join_status = JoinStatus.IDLE;
        }
    }
}


function handle_join(ws){
    if(waiter.length > 0){
        // match with existing waiter
        /** @type {WebSocket} */
        const opponent = waiter.pop();
        const game = new Game.Game(ws, opponent, 2);
        start_match(ws, opponent, game);
    }
    else{
        // wait
        ws.join_status = JoinStatus.MATCHING;
        waiter.push(ws);
    }
}

function handle_leave(ws){
    if(waiter.length>0 && Object.is(ws,waiter[0])){
        // was waiting
        waiter.pop();
        ws.join_status = JoinStatus.IDLE;
    }
    else if(ws.room != null){
        if(!ws.game.over){
            ws.game.finish(ws.opponent.board);
            send_update(ws, ws.opponent, ws.game);
        }
    }
}

wss.on('connection', (ws, req) => {
    console.log("connected to",req.socket.remoteAddress);

    ws.id = ID.user;
    ws.join_status = JoinStatus.IDLE;
    ID.user++;

    ws.on('error', console.error);
    
    ws.on('close', (code, reason) => {
        console.log(`closing ${ws.id} : ${code}, ${reason}`);
        handle_leave(ws);
    });

    ws.on('message', (raw_data)=>{
        const data = JSON.parse(raw_data);
        console.log(`U${ws.id} : `, data);
        if(ws.join_status == JoinStatus.IDLE){
            if(data.type=='join'){
                handle_join(ws);
            }
        }
        else if(ws.join_status == JoinStatus.MATCHING){
            if(data.type=='leave'){
                handle_leave(ws);
            }
        }
        else if(ws.join_status == JoinStatus.PLAYING){
            if(data.type=='leave'){
                handle_leave(ws);
                return;
            }

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
    });

    ws.send(JSON.stringify({a:'asdf'}));
});




server.listen(8080);