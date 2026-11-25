/**
 * Small, dependency-free argument parser shared by the CLI commands.
 * Supports `--flag value`, `--flag=value`, boolean flags, and `--` to stop
 * option parsing. Unknown options are reported as errors so typos fail loudly.
 */

export function parseArgs(argv = [], options = {}) {
  const valueFlags = new Set(options.valueFlags || []);
  const multiValueFlags = new Set(options.multiValueFlags || []);
  const booleanFlags = new Set(options.booleanFlags || []);
  const knownFlags = new Set([...valueFlags, ...multiValueFlags, ...booleanFlags, 'help', 'version']);
  const flags = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith('-') || token === '-') {
      positionals.push(token);
      continue;
    }

    const eqIndex = token.indexOf('=');
    const rawName = token.startsWith('--') ? token.slice(2) : token.slice(1);
    const name = eqIndex === -1 ? rawName : rawName.slice(0, eqIndex);
    const inlineValue = eqIndex === -1 ? undefined : token.slice(eqIndex + 1);

    if (booleanFlags.has(name)) {
      flags[name] = inlineValue === undefined
        ? true
        : inlineValue !== 'false' && inlineValue !== '0';
      continue;
    }

    if (valueFlags.has(name) || multiValueFlags.has(name)) {
      let value = inlineValue;
      if (value === undefined) {
        if (i + 1 >= argv.length || isKnownFlag(argv[i + 1], knownFlags)) {
          throw new Error(`Missing value for --${name}`);
        }
        value = argv[++i];
      }
      if (multiValueFlags.has(name)) {
        if (!Array.isArray(flags[name])) flags[name] = [];
        flags[name].push(value);
      } else {
        flags[name] = value;
      }
      continue;
    }

    throw new Error(`Unknown option: ${token}`);
  }

  return { flags, positionals };
}

function isKnownFlag(token, knownFlags) {
  if (!token.startsWith('--')) return false;
  const name = token.slice(2).split('=')[0];
  return knownFlags.has(name);
}
