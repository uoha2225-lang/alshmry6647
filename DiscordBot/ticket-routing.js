const DEFAULT_SUPPORT_LABEL = 'فريق التذاكر';

const TICKET_TYPE_CONFIG = Object.freeze({
    ticket_buy_product: {
        displayName: 'شراء منتج من المتجر',
        topicType: 'buy_product',
        roleEnvKey: 'TICKET_BUY_PRODUCT_ROLE_IDS',
    },
    ticket_inquiry: {
        displayName: 'استفسار',
        topicType: 'inquiry',
        roleEnvKey: 'TICKET_INQUIRY_ROLE_IDS',
    },
    ticket_tech_support: {
        displayName: 'طلب دعم فني',
        topicType: 'tech_support',
        roleEnvKey: 'TICKET_TECH_SUPPORT_ROLE_IDS',
    },
});

const TOPIC_TYPE_TO_TICKET_TYPE = Object.freeze(
    Object.fromEntries(
        Object.entries(TICKET_TYPE_CONFIG).map(([ticketType, config]) => [config.topicType, ticketType]),
    ),
);

const LEGACY_ADMIN_ROLE_ENV_KEYS = Object.freeze([
    'TICKET_ADMIN_ROLE_ID_1',
    'TICKET_ADMIN_ROLE_ID_2',
]);

const uniq = values => [...new Set(values)];

const splitRoleIds = (value = '') =>
    uniq(
        String(value)
            .split(',')
            .map(part => part.trim())
            .filter(Boolean),
    );

const getLegacyAdminRoleIds = (env = process.env) =>
    uniq(
        LEGACY_ADMIN_ROLE_ENV_KEYS
            .map(key => env[key])
            .filter(value => typeof value === 'string' && value.trim().length > 0)
            .map(value => value.trim()),
    );

const getTicketTypeConfig = ticketType => TICKET_TYPE_CONFIG[ticketType] || null;

function resolveTicketRoute(ticketType, env = process.env) {
    const config = getTicketTypeConfig(ticketType);
    if (!config) return null;

    const typeRoleIds = splitRoleIds(env[config.roleEnvKey]);
    const fallbackRoleIds = getLegacyAdminRoleIds(env);
    const roleIds = typeRoleIds.length > 0 ? typeRoleIds : fallbackRoleIds;
    const mentions = roleIds.map(id => `<@&${id}>`).join(' ');
    const notificationTarget = mentions || DEFAULT_SUPPORT_LABEL;

    return {
        ticketType,
        displayName: config.displayName,
        topicType: config.topicType,
        roleEnvKey: config.roleEnvKey,
        roleIds,
        mentions: mentions || DEFAULT_SUPPORT_LABEL,
        notificationTarget,
        usedTypeSpecificRoles: typeRoleIds.length > 0,
        usedLegacyFallback: typeRoleIds.length === 0 && fallbackRoleIds.length > 0,
    };
}

function buildTicketChannelTopic(ownerId, ticketType) {
    const route = resolveTicketRoute(ticketType);
    if (!route) {
        return `Owner: ${ownerId}`;
    }

    return `Owner: ${ownerId} | Type: ${route.topicType}`;
}

function parseTicketChannelTopic(topic = '') {
    const ownerMatch = String(topic).match(/Owner:\s*([^\s|]+)/i);
    const typeMatch = String(topic).match(/Type:\s*([a-z_]+)/i);
    const topicType = typeMatch ? typeMatch[1].trim() : null;
    const ticketType = topicType ? TOPIC_TYPE_TO_TICKET_TYPE[topicType] || null : null;

    return {
        ownerId: ownerMatch ? ownerMatch[1].trim() : null,
        topicType,
        ticketType,
    };
}

function resolveTicketRouteFromTopic(topic, env = process.env) {
    const parsed = parseTicketChannelTopic(topic);
    if (parsed.ticketType) {
        return {
            ...resolveTicketRoute(parsed.ticketType, env),
            ownerId: parsed.ownerId,
        };
    }

    const legacyRoleIds = getLegacyAdminRoleIds(env);
    const mentions = legacyRoleIds.map(id => `<@&${id}>`).join(' ');

    return {
        ticketType: null,
        displayName: null,
        topicType: parsed.topicType,
        ownerId: parsed.ownerId,
        roleIds: legacyRoleIds,
        mentions: mentions || DEFAULT_SUPPORT_LABEL,
        notificationTarget: mentions || DEFAULT_SUPPORT_LABEL,
        usedTypeSpecificRoles: false,
        usedLegacyFallback: legacyRoleIds.length > 0,
    };
}

function hasTicketAdminAccess({ memberRoleIds = [], channelTopic = '', isAdministrator = false, env = process.env }) {
    if (isAdministrator) return true;

    const route = resolveTicketRouteFromTopic(channelTopic, env);
    if (!route.roleIds.length) return false;

    const roleSet = new Set(memberRoleIds);
    return route.roleIds.some(roleId => roleSet.has(roleId));
}

module.exports = {
    DEFAULT_SUPPORT_LABEL,
    TICKET_TYPE_CONFIG,
    buildTicketChannelTopic,
    getLegacyAdminRoleIds,
    hasTicketAdminAccess,
    parseTicketChannelTopic,
    resolveTicketRoute,
    resolveTicketRouteFromTopic,
    splitRoleIds,
};
