import { WebSocket } from "ws";

export default class DiscordWsClient {
  ws!: WebSocket
  resume_gateway_url: undefined | string = undefined
  session_id: null | string = null
  s: null | string = null
  hbId: null | NodeJS.Timeout = null
  lastSequence: null | number = null
  state: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' = 'DISCONNECTED'

  constructor(private handleInteraction: Function) {
    this.initWs()
  }

  initWs(gateway_url?: string) {
    if(this.ws) this.ws.close()
    this.state = !!this.resume_gateway_url ? 'RECONNECTING' : 'DISCONNECTED'
    this.ws = new WebSocket(gateway_url || 'wss://gateway.discord.gg');
    this.ws.on('error', (err: unknown) => {
      console.log('Ws error', err)
    });
    this.ws.on('close', (data) => {
      console.log('Connexion closed', data)
    });
    this.ws.on('open', () => {
      console.log(`CONNECTED TO: ${this.ws.url}`)
      if(this.state !== 'RECONNECTING') return
      this.ws.send(JSON.stringify({
        "op": 6,
        "d": {
          "token": process.env.DISCORD_TOKEN,
          "session_id": this.session_id,
          "seq": this.s
        }
      }))
    })
    this.ws.on('message', (raw) => {
      const data = JSON.parse(raw as unknown as string)
      if(process.env.LOG_OP === "true") console.log(data.op)
      if(process.env.LOG_DATA === "true") console.log(data)

      switch (data.op) {
        case 0:
          this.s = data.s
          switch (data.t) {
            case 'READY':
              this.resume_gateway_url = data.d.resume_gateway_url
              this.session_id = data.d.session_id
              this.state = 'CONNECTED'
              console.log('HANDSHAKE SUCCESSFULL')
              break;
            case 'MESSAGE_CREATE':
              if (data.d.author.id !== process.env.SELF_DISCORD_ID) return
              this.handleInteraction(data)
              break;
          }
          break;
        case 1:
          this.lastSequence = data.d
          break;
        
        case 7:
          this.initWs(this.resume_gateway_url ?? undefined)
          break;
        
        case 9:
          this.state = 'CONNECTED'
          console.log('CONNEXION RESUMED')
          break;

        case 10:
          if(this.state === 'RECONNECTING') break;
          this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }))
          this.connect()
          this.heartbeat(data.d.heartbeat_interval)
          break;
      }
    })
  }

  connect() {
    this.ws.send(JSON.stringify({
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

  heartbeat(time: number) {
    if (this.hbId) clearInterval(this.hbId)
    console.log('stating heartbeat')
    this.hbId = setInterval(() => this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence })), time)
  }
}