import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js';

export interface ExtendedClient extends Client {
    commands: Map<string, Command>;
}

export interface Command {
    data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => void;
}
