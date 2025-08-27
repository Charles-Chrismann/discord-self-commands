# discord-self-commands

**discord-self-commands** is a project that allows you to interact with your machine's terminal through Discord messages. By sending commands via Discord, you can execute them on the machine where the bot is running.

## Features

- Execute terminal commands remotely via Discord.
- Receive command output directly in Discord.
- Lightweight and easy to set up.

## Usage

1. Install the project on your machine.
2. Configure your Discord bot token and server/channel.
3. Send commands to the bot in Discord.
4. Receive the output of your commands directly in Discord messages.

## Security Warning

- This project allows execution of arbitrary terminal commands. **Use at your own risk.**
- Make sure to run it only on trusted machines and Discord servers.
- Do not expose the bot to untrusted users.

## Installation

```bash
git clone https://github.com/yourusername/discord-self-commands.git
cd discord-self-commands
npm install
```

# Configuration

- Set your Discord bot token and target channel in the configuration file or environment variables.

## License

This project is [MIT licensed](LICENSE).
