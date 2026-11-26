export function getGreeting(name, date = new Date()) {
  const hour = date.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = name?.trim().split(/\s+/)[0] || "there";
  return `${greeting}, ${firstName}.`;
}
