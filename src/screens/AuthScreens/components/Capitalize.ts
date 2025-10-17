type props = any;

export function capitalizeFirstLetter(str : props) {
 
  return str.charAt(0)?.toUpperCase() + str.slice(1);
}