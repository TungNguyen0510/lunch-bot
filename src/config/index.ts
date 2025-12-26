import dotenv from 'dotenv';

dotenv.config();

export const config = {
    discordToken: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    price: Number(process.env.PRICE) || 35000,
};

if (!config.discordToken) {
    throw new Error('Missing DISCORD_TOKEN in .env');
}
