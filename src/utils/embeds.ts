import { EmbedBuilder } from 'discord.js';

export function createMenuEmbed(menu: any, orders: any[]) {
    const isExpired = menu.isClosed || new Date() > new Date(menu.expiresAt);

    const orderList = orders.length > 0
        ? orders.map((o, i) => `${i + 1}. ${o.user.displayName}`).join('\n')
        : '_Chưa có người đặt_';

    const embed = new EmbedBuilder()
        .setTitle(`🍱 Ngày ${menu.date.split('-').reverse().join('/')}`)
        .setDescription(menu.content)
        .setColor(isExpired ? 0xFF0000 : 0x00FF00) // Red if expired, Green if active
        .addFields(
            { name: 'Giá', value: `${menu.price.toLocaleString()} VND`, inline: true },
            {
                name: 'Hết hạn',
                value: isExpired ? '**Đã hết hạn**' : `<t:${Math.floor(menu.expiresAt.getTime() / 1000)}:R>`,
                inline: true
            },
            { name: `Người đặt (${orders.length})`, value: orderList }
        );

    return embed;
}
