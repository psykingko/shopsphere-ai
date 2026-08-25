/**
 * A fast, simple 32-bit PRNG (Mulberry32).
 */
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

class DeterministicSeeder {
    constructor(seedString) {
        // Hash seed string to an integer
        let seed = 0;
        for (let i = 0; i < seedString.length; i++) {
            seed = Math.imul(31, seed) + seedString.charCodeAt(i) | 0;
        }
        this.random = mulberry32(seed);
    }

    rand() {
        return this.random();
    }

    randInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    randFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    choice(array) {
        if (array.length === 0) return null;
        return array[this.randInt(0, array.length - 1)];
    }

    /**
     * Generates a deterministic UUID compliant with UUIDv4 format constraints.
     */
    uuid() {
        // Generate 32 hex chars deterministically
        const hex = '0123456789abcdef';
        let str = '';
        for (let i = 0; i < 32; i++) {
            str += hex[this.randInt(0, 15)];
        }

        // Enforce v4 bits
        const chars = str.split('');
        chars[12] = '4'; // version 4
        // Variant must be 8, 9, a, or b
        chars[16] = hex[8 + this.randInt(0, 3)];

        // Format 8-4-4-4-12
        return chars.slice(0, 8).join('') + '-' +
               chars.slice(8, 12).join('') + '-' +
               chars.slice(12, 16).join('') + '-' +
               chars.slice(16, 20).join('') + '-' +
               chars.slice(20).join('');
    }

    date(start, end) {
        return new Date(start.getTime() + this.random() * (end.getTime() - start.getTime()));
    }
}

module.exports = {
    DeterministicSeeder
};
