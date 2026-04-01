const test = require('node:test');
const assert = require('node:assert/strict');

const {
    DEFAULT_SUPPORT_LABEL,
    buildTicketChannelTopic,
    hasTicketAdminAccess,
    parseTicketChannelTopic,
    resolveTicketRoute,
    resolveTicketRouteFromTopic,
} = require('./ticket-routing.js');

test('resolveTicketRoute uses type-specific roles before legacy fallback', () => {
    const route = resolveTicketRoute('ticket_inquiry', {
        TICKET_INQUIRY_ROLE_IDS: '111, 222',
        TICKET_ADMIN_ROLE_ID_1: '999',
        TICKET_ADMIN_ROLE_ID_2: '888',
    });

    assert.equal(route.displayName, 'استفسار');
    assert.deepEqual(route.roleIds, ['111', '222']);
    assert.equal(route.mentions, '<@&111> <@&222>');
    assert.equal(route.usedTypeSpecificRoles, true);
    assert.equal(route.usedLegacyFallback, false);
});

test('resolveTicketRoute falls back to legacy admin roles when type-specific roles are absent', () => {
    const route = resolveTicketRoute('ticket_inquiry', {
        TICKET_ADMIN_ROLE_ID_1: '999',
        TICKET_ADMIN_ROLE_ID_2: '888',
    });

    assert.deepEqual(route.roleIds, ['999', '888']);
    assert.equal(route.mentions, '<@&999> <@&888>');
    assert.equal(route.usedTypeSpecificRoles, false);
    assert.equal(route.usedLegacyFallback, true);
});

test('resolveTicketRoute returns neutral fallback text when no roles are configured', () => {
    const route = resolveTicketRoute('ticket_tech_support', {});

    assert.deepEqual(route.roleIds, []);
    assert.equal(route.mentions, DEFAULT_SUPPORT_LABEL);
    assert.equal(route.notificationTarget, DEFAULT_SUPPORT_LABEL);
});

test('topic helpers preserve owner and ticket type for new channels', () => {
    const topic = buildTicketChannelTopic('123456', 'ticket_inquiry');
    const parsed = parseTicketChannelTopic(topic);

    assert.equal(topic, 'Owner: 123456 | Type: inquiry');
    assert.deepEqual(parsed, {
        ownerId: '123456',
        topicType: 'inquiry',
        ticketType: 'ticket_inquiry',
    });
});

test('resolveTicketRouteFromTopic supports legacy owner-only topics', () => {
    const route = resolveTicketRouteFromTopic('Owner: 123456', {
        TICKET_ADMIN_ROLE_ID_1: '500',
    });

    assert.equal(route.ownerId, '123456');
    assert.equal(route.ticketType, null);
    assert.deepEqual(route.roleIds, ['500']);
    assert.equal(route.mentions, '<@&500>');
});

test('hasTicketAdminAccess honors type-specific roles and administrator override', () => {
    const env = {
        TICKET_INQUIRY_ROLE_IDS: '111,222',
        TICKET_ADMIN_ROLE_ID_1: '999',
    };
    const topic = buildTicketChannelTopic('123456', 'ticket_inquiry');

    assert.equal(
        hasTicketAdminAccess({ memberRoleIds: ['222'], channelTopic: topic, env }),
        true,
    );

    assert.equal(
        hasTicketAdminAccess({ memberRoleIds: ['999'], channelTopic: topic, env }),
        false,
    );

    assert.equal(
        hasTicketAdminAccess({ memberRoleIds: [], channelTopic: topic, env, isAdministrator: true }),
        true,
    );
});
