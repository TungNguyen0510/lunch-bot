import { REST, Routes } from 'discord.js';
import { config } from './config';
import { menuCommand } from './commands/menu';
import { orderCommand } from './commands/order';
import { statsCommand } from './commands/stats';
import { helpCommand } from './commands/help';

const commands = [
    menuCommand.data.toJSON(),
    orderCommand.data.toJSON(),
    statsCommand.data.toJSON(),
    helpCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.discordToken);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        // Using Guild commands for instant update. Global commands take 1 hour.
        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${(data as any).length} application (/) commands.`);
    } catch (error: any) {
        console.error(error);
        if (error.code === 50001) {
            console.error('\n❌ ERROR: Missing Access (50001)');
            console.error('This means the bot lacks permission to create commands in this guild.');
            console.error('PROBABLE CAUSES:');
            console.error('1. The CLIENT_ID or GUILD_ID in .env is incorrect.');
            console.error('2. The bot was invited WITHOUT the "applications.commands" scope.');
            console.error('3. The bot is not in the server with ID: ' + config.guildId);
            console.error('\nFIX: Re-invite the bot using an invite link with "applications.commands" scope enabled.\n');
        }
    }
})();
