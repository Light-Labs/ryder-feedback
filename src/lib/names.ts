/**
 * A friendly default name for anyone who does not type one: "Curious Otter".
 *
 * Derived from the uid rather than stored or random, so a visitor is the same
 * animal on every post and comment from this browser, the server and the
 * client agree without talking to each other, and a name typed into the
 * request cannot pose as somebody else's default - the server computes it
 * from the verified token.
 *
 * The lists are hand-picked instead of pulled from a package: every word here
 * ends up on a public company page next to someone's idea, so each one has
 * been read, and no pairing can come out as an insult. Keep additions
 * kind, unambiguous and free of slang meanings. Any change to either list -
 * even appending - reshuffles the default for every visitor who has not
 * typed a name; posts already written keep the name they were saved with.
 *
 * 64 x 64 = 4,096 names. Two visitors will sometimes share one; it is a
 * label, not an identity, and the uid stays the identity.
 */

const ADJECTIVES = [
  "Agile", "Amber", "Breezy", "Bright", "Brisk", "Calm", "Cheerful", "Clever",
  "Cosmic", "Cozy", "Crisp", "Curious", "Daring", "Dapper", "Eager", "Earnest",
  "Fearless", "Fluffy", "Friendly", "Gentle", "Gleaming", "Golden", "Graceful", "Happy",
  "Helpful", "Honest", "Hopeful", "Humble", "Jolly", "Keen", "Kind", "Lively",
  "Lucky", "Mellow", "Merry", "Mighty", "Nimble", "Noble", "Patient", "Peppy",
  "Plucky", "Polite", "Quick", "Quiet", "Radiant", "Rapid", "Rosy", "Serene",
  "Sincere", "Snappy", "Sparkly", "Spirited", "Steady", "Sunny", "Swift", "Thoughtful",
  "Tidy", "Trusty", "Upbeat", "Valiant", "Vivid", "Witty", "Zesty", "Zippy",
] as const;

const ANIMALS = [
  "Albatross", "Alpaca", "Badger", "Beaver", "Bison", "Bluebird", "Capybara", "Cheetah",
  "Chipmunk", "Crane", "Dolphin", "Dragonfly", "Eagle", "Falcon", "Ferret", "Finch",
  "Flamingo", "Fox", "Gazelle", "Gecko", "Giraffe", "Hedgehog", "Heron", "Hummingbird",
  "Ibis", "Jaguar", "Kangaroo", "Kingfisher", "Koala", "Lemur", "Leopard", "Lynx",
  "Manatee", "Meerkat", "Moose", "Narwhal", "Ocelot", "Octopus", "Orca", "Osprey",
  "Otter", "Owl", "Panda", "Pangolin", "Pelican", "Penguin", "Puffin", "Quokka",
  "Rabbit", "Raccoon", "Raven", "Reindeer", "Robin", "Salmon", "Seal", "Sparrow",
  "Squirrel", "Swan", "Tapir", "Tiger", "Toucan", "Turtle", "Walrus", "Wombat",
] as const;

/** FNV-1a, 32-bit. Small, stable across runtimes, well spread for short ids. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function generatedName(uid: string): string {
  const h = hash(uid);
  const adjective = ADJECTIVES[h % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(h / ADJECTIVES.length) % ANIMALS.length];
  return `${adjective} ${animal}`;
}
