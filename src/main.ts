import 'dotenv/config'
import WebSocket from 'ws';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { EventEmitter } from 'events';

const PREFIX = process.env.COMMAND_PREFIX

const pathEmitter = new EventEmitter()
pathEmitter.on('path', () => {
  child.stdin.write(cmd + '\n')
})

let hbId: NodeJS.Timeout
let lastSequence: null | any = null
function heartbeat(time: number) {
  if (hbId) clearInterval(hbId)
  console.log('stating heartbeat')
  hbId = setInterval(() => ws.send(JSON.stringify({ op: 1, d: lastSequence })), time)
}

async function postResponse(d: any) {
  const log = d.toString()
  const content = `\`\`\`sh\n${cmd ? `${currentPWD}$ ${cmd}\n` : ''}${log}\`\`\``
  cmd = null
  const headers = new Headers
  headers.set("Authorization", process.env.DISCORD_TOKEN)
  headers.set("Content-Type", "application/json")
  await fetch(`https://discord.com/api/v9/channels/${currentChannelIntercation}/messages`, {
    headers,
    body: JSON.stringify({
      content
    }),
    "method": "POST",
  });
}

async function react() {
  const headers = new Headers
  headers.set("Authorization", process.env.DISCORD_TOKEN)
  const res = await (await fetch(`https://discord.com/api/v9/channels/${currentChannelIntercation}/messages/${lastMsgId}/reactions/✅/@me?location=Message&type=0`, {
    headers,
    method: "PUT",
  })).text()
  console.log(res)
}

let isGettingPWD: boolean
let currentPWD: string
let sshInteraction: null | boolean = false
let currentChannelIntercation: null | number
let lastMsgId: number
let child: ChildProcessWithoutNullStreams
let cmd: string | null
function handleInteraction(data: any) {
  if (data.d.content !== `${PREFIX}ssh` && !sshInteraction) return
  if (sshInteraction && data.d.channel_id !== currentChannelIntercation) return
  if (data.d.content === `${PREFIX}ssh`) {
    currentChannelIntercation = data.d.channel_id
    sshInteraction = true
    child = spawn('bash', {
      shell: true
    });

    child.stdout.on('data', async (data) => {
      console.log(`child stdout:\n${data}`);
      if (isGettingPWD) {
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
      react()
      currentChannelIntercation = null
      sshInteraction = null
      cmd = null
      console.log('child process exited with ' +
        `code ${code} and signal ${signal}`);
    });

    child.on('error', function (code: any, signal: any) {
      console.log('ya error')
    });

    child.stdin.write('pwd\n')
  } else if (data.d.content.startsWith(PREFIX)) {
    lastMsgId = data.d.id
    cmd = String(data.d.content).replace(/^\$/, '')
    console.log('cmd: ' + cmd)
    isGettingPWD = true
    child.stdin.write('pwd\n')
  }
}

function connect() {
  ws.send(JSON.stringify({
    op: 2,
    d: {
      token: process.env.DISCORD_TOKEN,
      properties: {
        "os": "linux",
        "browser": "disco",
        "device": "disco"
      },
      intents: 512
    }
  }))
}

const ws = new WebSocket('wss://gateway.discord.gg');
ws.on('error',(err: unknown) => {
  console.error(err)
  connect()
});
ws.on('close', (data) => {
  console.log('Connexion closed', data)
  connect()
});
ws.on('open', connect)
ws.on('message', (raw) => {
  const data = JSON.parse(raw as unknown as string)

  switch (data.op) {
    case 0:
      switch (data.t) {
        case 'MESSAGE_CREATE':
          if (data.d.author.id !== process.env.SELF_DISCORD_ID) return
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

