import moment from 'moment';
import 'moment-hijri';
const m = moment('1430/04/20', 'iYYYY/iMM/iDD');
console.log('Test 1:', m.toDate());
const m2 = moment('1430/4/20', 'iYYYY/iM/iD');
console.log('Test 2:', m2.toDate());
