"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ws_1 = __importDefault(require("ws"));
const child_process_1 = require("child_process");
const events_1 = require("events");
const pathEmitter = new events_1.EventEmitter();
pathEmitter.on('path', () => {
    child.stdin.write(cmd + '\n');
});
let hbId;
let lastSequence = null;
function heartbeat(time) {
    if (hbId)
        clearInterval(hbId);
    console.log('stating heartbeat');
    hbId = setInterval(() => ws.send(JSON.stringify({ op: 1, d: lastSequence })), time);
}
function postResponse(d) {
    return __awaiter(this, void 0, void 0, function* () {
        const log = d.toString();
        const content = `\`\`\`sh\n${cmd ? `${currentPWD}$ ${cmd}\n` : ''}${log}\`\`\``;
        cmd = null;
        const headers = new Headers;
        headers.set("Authorization", process.env.DISCORD_TOKEN);
        headers.set("Content-Type", "application/json");
        yield fetch(`https://discord.com/api/v9/channels/${currentChannelIntercation}/messages`, {
            headers,
            body: JSON.stringify({
                content
            }),
            "method": "POST",
        });
    });
}
function react(messageId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(currentChannelIntercation, messageId);
        const headers = new Headers;
        headers.set("Authorization", process.env.DISCORD_TOKEN);
        const res = yield (yield fetch(`https://discord.com/api/v9/channels/${currentChannelIntercation}/messages/${lastMsgId}/reactions/✅/@me?location=Message&type=0`, {
            headers,
            method: "PUT",
        })).text();
        console.log(res);
    });
}
let isGettingPWD;
let currentPWD;
let sshInteraction = false;
let currentChannelIntercation;
let lastMsgId;
let child;
let cmd;
function handleInteraction(data) {
    if (data.d.content !== '# ssh' && !sshInteraction)
        return;
    if (sshInteraction && data.d.channel_id !== currentChannelIntercation)
        return;
    if (data.d.content === '# ssh') {
        currentChannelIntercation = data.d.channel_id;
        sshInteraction = true;
        child = (0, child_process_1.spawn)('bash', {
            shell: true
        });
        child.stdout.on('data', (data) => __awaiter(this, void 0, void 0, function* () {
            console.log(`child stdout:\n${data}`);
            if (isGettingPWD) {
                isGettingPWD = false;
                currentPWD = data.toString().replace(/\n$/, '');
                pathEmitter.emit('path');
                return;
            }
            yield postResponse(data);
        }));
        child.stderr.on('data', (data) => {
            console.error(`child stderr:\n${data}`);
        });
        child.on('exit', function (code, signal) {
            react(data.d.id);
            currentChannelIntercation = null;
            sshInteraction = null;
            cmd = null;
            console.log('child process exited with ' +
                `code ${code} and signal ${signal}`);
        });
        child.on('error', function (code, signal) {
            console.log('ya error');
        });
        child.stdin.write('pwd\n');
    }
    else if (data.d.content.startsWith('$ ')) {
        lastMsgId = data.d.id;
        cmd = String(data.d.content).replace(/^\$ /, '');
        console.log('cmd: ' + cmd);
        isGettingPWD = true;
        child.stdin.write('pwd\n');
    }
}
const ws = new ws_1.default('wss://gateway.discord.gg');
ws.on('error', console.error);
ws.on('close', (data) => console.log('closed', data));
ws.on('open', (data) => {
    ws.send(JSON.stringify({
        op: 2,
        d: {
            token: process.env.token,
            properties: {
                "os": "linux",
                "browser": "disco",
                "device": "disco"
            }
        }
    }));
    ws.on('message', (raw) => {
        data = JSON.parse(raw);
        switch (data.op) {
            case 0:
                switch (data.t) {
                    case 'MESSAGE_CREATE':
                        if (data.d.author.id !== process.env.SELF_DISCORD_ID)
                            return;
                        handleInteraction(data);
                        break;
                }
                break;
            case 1:
                lastSequence = data.d;
                break;
            case 10:
                heartbeat(data.d.heartbeat_interval);
                break;
        }
    });
});
