const assert = require('node:assert/strict');
const test = require('node:test');
const { EmbedBuilder } = require('discord.js');

test('EmbedBuilder accepts the unified ticket attachment URL', () => {
    const embed = new EmbedBuilder()
        .setTitle('Test')
        .setImage('attachment://ticket-embed-unified.webp')
        .setColor(0x0099ff);

    assert.equal(embed.toJSON().image.url, 'attachment://ticket-embed-unified.webp');
});
