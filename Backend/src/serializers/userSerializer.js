function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    parishId: user.parish_id || null,
    centreId: user.centre_id || null,
    groupId: user.group_id || null,
  }
}

module.exports = { serializeUser }
