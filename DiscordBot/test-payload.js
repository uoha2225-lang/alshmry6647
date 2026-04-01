const path = require('path');
const assert = require('node:assert/strict');
const test = require('node:test');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder,
} = require('discord.js');

const TICKET_EMBED_IMAGE_NAME = 'ticket-embed-unified.webp';
const TICKET_EMBED_IMAGE_PATH = path.join(__dirname, 'assets', TICKET_EMBED_IMAGE_NAME);
const TICKET_EMBED_IMAGE_URL = `attachment://${TICKET_EMBED_IMAGE_NAME}`;

test('ticket payload builds with the unified attachment image', () => {
    const attachment = new AttachmentBuilder(TICKET_EMBED_IMAGE_PATH, { name: TICKET_EMBED_IMAGE_NAME });
    const embed = new EmbedBuilder()
        .setTitle('Test')
        .setImage(TICKET_EMBED_IMAGE_URL)
        .setColor(0x0099ff);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('test').setLabel('test').setStyle(ButtonStyle.Primary)
    );
    const payload = { embeds: [embed.toJSON()], components: [row.toJSON()], files: [attachment] };

    assert.equal(payload.embeds[0].image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(payload.files[0].name, TICKET_EMBED_IMAGE_NAME);
});
