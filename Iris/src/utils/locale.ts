export function getOSLocale(){
	return Intl.DateTimeFormat().resolvedOptions().locale.split("-");
}