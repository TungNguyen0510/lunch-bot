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
    } catch (error) {
        console.error(error);
    }
})();
