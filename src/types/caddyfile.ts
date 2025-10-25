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
	caddyId?: string; // The @id tag value for Caddy API access
}

export interface CaddyConfig {
	siteBlocks: CaddySiteBlock[];
	globalOptions?: CaddyDirective[];
}

export interface CaddyUpstream {
	address: string;
	num_requests: number;
	fails: number;
}

export interface CaddyPKICA {
	id: string;
	name: string;
	root_common_name: string;
	intermediate_common_name: string;
	root_certificate: string;
	intermediate_certificate: string;
}
