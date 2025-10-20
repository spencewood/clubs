export interface CaddyDirective {
	id: string;
	name: string;
	args: string[];
	block?: CaddyDirective[];
	raw?: string;
}

export interface CaddySiteBlock {
	id: string;
	addresses: string[];
	directives: CaddyDirective[];
}

export interface CaddyConfig {
	siteBlocks: CaddySiteBlock[];
	globalOptions?: CaddyDirective[];
}
