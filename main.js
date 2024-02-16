import 'dotenv/config'
import * as fs from 'fs'
import WebSocket from 'ws';
import { spawn } from 'child_process'
import { EventEmitter } from 'events';

const pathEmitter = new EventEmitter()
pathEmitter.on('path', () => {
  child.stdin.write(cmd + '\n')
})

let hbId
let lastSequence = null
function heartbeat(time) {
  if(hbId) clearInterval(hbId)
  console.log('stating heartbeat')
  hbId = setInterval(() => ws.send(JSON.stringify({ op: 1, d: lastSequence })), time)
}

async function postResponse(d) {
  const log = d.toString()
  const content = `\`\`\`sh\n${ cmd ? `${currentPWD}$ ${cmd}\n` : ''}${log}\`\`\``
  cmd = null
  await fetch(`https://discord.com/api/v9/channels/${currentChannelIntercation}/messages`, {
    "headers": {
        "Content-Type": "application/json",
        Authorization: process.env.token,
    },
    body: JSON.stringify({
      content
    }),
    "method": "POST",
  });
}

async function react(messageId) {
  console.log(currentChannelIntercation, messageId)
  const res = await (await fetch(`https://discord.com/api/v9/channels/${currentChannelIntercation}/messages/${lastMsgId}/reactions/✅/@me?location=Message&type=0`, {
    "headers": {
        "Authorization": process.env.token,
    },
    "method": "PUT",
})).text()
  console.log(res)
}

let isGettingPWD
let currentPWD
let sshInteraction = false
let currentChannelIntercation
let lastMsgId
let child
let cmd
let cmdSucces = false
function handleInteraction(data) {
  if(data.d.content !== '# ssh' && !sshInteraction) return
  if(sshInteraction && data.d.channel_id !== currentChannelIntercation) return
  if(data.d.content === '# ssh') {
    currentChannelIntercation = data.d.channel_id
    sshInteraction = true
    child = spawn('bash', {
      shell: true
    });

    child.stdout.on('data', async (data) => {
      console.log(`child stdout:\n${data}`);
      if(isGettingPWD) {
        isGettingPWD = false
        currentPWD = data.toString().replace(/\n$/, '')
        pathEmitter.emit('path')
        return
      }
      await postResponse(data)
    });
    
    child.stderr.on('data', (data) => {
      console.error(`child stderr:\n${data}`);
    });
    
    child.on('exit', function (code, signal) {
      react(data.d.id)
      currentChannelIntercation = null
      sshInteraction = null
      cmd = null
      console.log('child process exited with ' +
                  `code ${code} and signal ${signal}`);
    });
    
    child.on('error', function (code, signal) {
      console.log('ya error')
    });

    child.stdin.write('pwd\n')
  } else if (data.d.content.startsWith('$ ')) {
    lastMsgId = data.d.id
    cmd = String(data.d.content).replace(/^\$ /, '')
    console.log('cmd: ' + cmd)
    isGettingPWD = true
    child.stdin.write('pwd\n')
  }
}

const ws = new WebSocket('wss://gateway.discord.gg');
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
  }))
  ws.on('message', (raw) => {
    data = JSON.parse(raw)

    switch (data.op) {
      case 0:
        switch (data.t) {
          case 'MESSAGE_CREATE': 
            if(data.d.author.id !== process.env.SELF_DISCORD_ID) return
            handleInteraction(data)
            break;
        }
        break;
      case 1:
        lastSequence = data.d
        break;
      case 10:
        heartbeat(data.d.heartbeat_interval)
        break;
    }
  })
})

