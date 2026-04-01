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
    resolveTicketOwnerProfile,
    TICKET_EMBED_IMAGE_NAME,
    TICKET_EMBED_IMAGE_URL,
} = __ticketEmbedTestables;

const ticketImagePath = path.join(__dirname, 'assets', TICKET_EMBED_IMAGE_NAME);

test('ticket embed unified asset is present', () => {
    assert.equal(TICKET_EMBED_IMAGE_NAME, 'ticket-embed-unified.webp');
    assert.ok(fs.existsSync(ticketImagePath), `Missing image file at ${ticketImagePath}`);
    assert.ok(fs.statSync(ticketImagePath).size > 0, 'Unified image file is empty');
});

test('ticket owner profile prefers guild display name and avatar when available', () => {
    const profile = resolveTicketOwnerProfile({
        member: {
            displayName: 'مالك العرض',
            displayAvatarURL: () => 'https://example.com/member-avatar.png',
        },
        user: {
            id: '42',
            globalName: 'الاسم العام',
            username: 'username',
            displayAvatarURL: () => 'https://example.com/user-avatar.png',
        },
    });

    assert.deepEqual(profile, {
        displayName: 'مالك العرض',
        avatarURL: 'https://example.com/member-avatar.png',
    });
});

test('ticket owner profile falls back to global name and default avatar', () => {
    const profile = resolveTicketOwnerProfile({
        user: {
            id: '7',
            globalName: 'الاسم العام',
            username: 'username',
            displayAvatarURL: () => '',
        },
    });

    assert.deepEqual(profile, {
        displayName: 'الاسم العام',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/1.png',
    });
});

test('ticket embeds keep the unified banner and use the opener identity in author and thumbnail', () => {
    const fakeUser = {
        id: '42',
        username: 'tester',
        displayAvatarURL: () => 'https://example.com/user-avatar.png',
    };
    const fakeMember = {
        displayName: 'صاحب التذكرة',
        displayAvatarURL: () => 'https://example.com/member-avatar.png',
    };
    const ownerProfile = resolveTicketOwnerProfile({ member: fakeMember, user: fakeUser });

    const mainEmbed = createTicketMainEmbed().toJSON();
    const optionsEmbed = createTicketOptionsEmbed().toJSON();
    const ticketEmbed = createTicketEmbed({
        ticketType: 'استفسار',
        ticketNumber: 42,
        ownerDisplayName: ownerProfile.displayName,
        ownerAvatarURL: ownerProfile.avatarURL,
        supportLabel: 'فريق التذاكر',
    }).toJSON();

    assert.equal(mainEmbed.image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(optionsEmbed.image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(ticketEmbed.image.url, TICKET_EMBED_IMAGE_URL);
    assert.equal(ticketEmbed.thumbnail.url, ownerProfile.avatarURL);
    assert.equal(ticketEmbed.author.icon_url, ownerProfile.avatarURL);
    assert.equal(ticketEmbed.author.name, '👤 | مالك التذكرة: صاحب التذكرة');
    assert.equal(ticketEmbed.fields[0].value, 'فريق التذاكر');
});

test('ticket payload attaches exactly one unified image file', () => {
    const payload = buildTicketMessage(createTicketMainEmbed());

    assert.equal(payload.files.length, 1);
    assert.equal(payload.files[0].name, TICKET_EMBED_IMAGE_NAME);
    assert.equal(payload.files[0].attachment, ticketImagePath);
    assert.equal(payload.embeds[0].toJSON().image.url, TICKET_EMBED_IMAGE_URL);
});
