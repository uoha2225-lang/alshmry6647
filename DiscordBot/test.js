const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const test = require('node:test');

const { __ticketEmbedTestables } = require('./client.js');

const {
    createTicketMainEmbed,
    createTicketOptionsEmbed,
    createTicketEmbed,
    buildTicketMessage,
    TICKET_EMBED_IMAGE_NAME,
    TICKET_EMBED_IMAGE_URL,
} = __ticketEmbedTestables;

const ticketImagePath = path.join(__dirname, 'assets', TICKET_EMBED_IMAGE_NAME);

test('ticket embed unified asset is present', () => {
    assert.equal(TICKET_EMBED_IMAGE_NAME, 'ticket-embed-unified.webp');
    assert.ok(fs.existsSync(ticketImagePath), `Missing image file at ${ticketImagePath}`);
    assert.ok(fs.statSync(ticketImagePath).size > 0, 'Unified image file is empty');
});

test('ticket embeds use the unified attachment URL in every image slot', () => {
    const fakeUser = {
        username: 'tester',
        displayAvatarURL: () => 'https://example.com/avatar.png',
    };

    const mainEmbed = createTicketMainEmbed().toJSON();
    const optionsEmbed = createTicketOptionsEmbed().toJSON();
    const ticketEmbed = createTicketEmbed('استفسار', 42, fakeUser, {}).toJSON();

    assert.equal(mainEmbed.image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(optionsEmbed.image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(ticketEmbed.image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(ticketEmbed.thumbnail.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(ticketEmbed.author.icon_url, TICKET_EMBED_IMAGE_URL);
});

test('ticket payload attaches exactly one unified image file', () => {
    const payload = buildTicketMessage(createTicketMainEmbed());

    assert.equal(payload.files.length, 1);
    assert.equal(payload.files[0].name, TICKET_EMBED_IMAGE_NAME);
    assert.equal(payload.files[0].attachment, ticketImagePath);
    assert.equal(payload.embeds[0].toJSON().image.url, TICKET_EMBED_IMAGE_URL);
});
