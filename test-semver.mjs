import semver from 'semver';

console.log('Testing semver ^24.11:');
console.log('v24.11.0 satisfies ^24.11?', semver.satisfies('24.11.0', '^24.11'));
console.log('v24.12.0 satisfies ^24.11?', semver.satisfies('24.12.0', '^24.11'));
console.log('v25.0.0 satisfies ^24.11?', semver.satisfies('25.0.0', '^24.11'));

console.log('\nRange for ^24.11:', semver.validRange('^24.11'));
