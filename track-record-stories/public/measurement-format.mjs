// Format only at the display boundary; calculations retain the source precision.
const number=new Intl.NumberFormat('en',{maximumFractionDigits:1});
const decimal=new Intl.NumberFormat('en',{minimumFractionDigits:1,maximumFractionDigits:1});
export const formatNumber=value=>number.format(value);
export const formatDecimal=value=>decimal.format(value);

// Activity times need seconds. Round once before splitting so 59.5s carries
// into the next minute (and 59m 59.5s into the next hour).
export function formatActivityTime(seconds){
 const total=Math.round(seconds),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),remainder=String(total%60).padStart(2,'0');
 return hours?`${hours}h ${String(minutes).padStart(2,'0')}m ${remainder}s`:`${minutes}m ${remainder}s`;
}
