import { describe, expect, it } from "vitest";
import {
	consolidateUpstreams,
	consolidateUpstreamsWithConfig,
	getConfiguredUpstreams,
	parseAddress,
} from "@/lib/upstream-utils";
import type { CaddyConfig, CaddyUpstream } from "@/types/caddyfile";

describe("Upstream Utilities", () => {
	describe("parseAddress", () => {
		describe("hostname with ports", () => {
			it("should parse hostname with port", () => {
				const result = parseAddress("burger:3000");
				expect(result.server).toBe("burger");
				expect(result.port).toBe(3000);
			});

			it("should parse different ports on same hostname", () => {
				const result1 = parseAddress("burger:3000");
				const result2 = parseAddress("burger:8080");

				expect(result1.server).toBe("burger");
				expect(result1.port).toBe(3000);
				expect(result2.server).toBe("burger");
				expect(result2.port).toBe(8080);
				// Same server name
				expect(result1.server).toBe(result2.server);
			});

			it("should parse localhost with port", () => {
				const result = parseAddress("localhost:8080");
				expect(result.server).toBe("localhost");
				expect(result.port).toBe(8080);
			});
		});

		describe("hostname without port", () => {
			it("should parse hostname without port", () => {
				const result = parseAddress("burger");
				expect(result.server).toBe("burger");
				expect(result.port).toBeNull();
			});

			it("should treat hostname without port as same server", () => {
				const result1 = parseAddress("burger");
				const result2 = parseAddress("burger:3000");

				expect(result1.server).toBe(result2.server);
			});
		});

		describe("IPv4 addresses", () => {
			it("should parse IPv4 with port", () => {
				const result = parseAddress("1.1.1.1:80");
				expect(result.server).toBe("1.1.1.1");
				expect(result.port).toBe(80);
			});

			it("should parse IPv4 without port", () => {
				const result = parseAddress("1.1.1.1");
				expect(result.server).toBe("1.1.1.1");
				expect(result.port).toBeNull();
			});

			it("should treat same IPv4 with different ports as same server", () => {
				const result1 = parseAddress("1.1.1.1");
				const result2 = parseAddress("1.1.1.1:80");
				const result3 = parseAddress("1.1.1.1:443");

				expect(result1.server).toBe("1.1.1.1");
				expect(result2.server).toBe("1.1.1.1");
				expect(result3.server).toBe("1.1.1.1");
				expect(result1.server).toBe(result2.server);
				expect(result2.server).toBe(result3.server);
			});

			it("should parse common ports", () => {
				expect(parseAddress("192.168.1.1:80").port).toBe(80);
				expect(parseAddress("192.168.1.1:443").port).toBe(443);
				expect(parseAddress("192.168.1.1:8080").port).toBe(8080);
				expect(parseAddress("192.168.1.1:3000").port).toBe(3000);
			});
		});

		describe("IPv6 addresses", () => {
			it("should parse IPv6 with port", () => {
				const result = parseAddress("[::1]:8080");
				expect(result.server).toBe("::1");
				expect(result.port).toBe(8080);
			});

			it("should parse full IPv6 with port", () => {
				const result = parseAddress("[2001:db8::1]:443");
				expect(result.server).toBe("2001:db8::1");
				expect(result.port).toBe(443);
			});

			it("should parse IPv6 localhost variations", () => {
				const result1 = parseAddress("[::1]:8080");
				const result2 = parseAddress("[::1]:9090");

				expect(result1.server).toBe("::1");
				expect(result2.server).toBe("::1");
				expect(result1.server).toBe(result2.server);
			});
		});

		describe("edge cases", () => {
			it("should handle malformed addresses gracefully", () => {
				// Multiple colons without brackets - treats as hostname without port
				const result = parseAddress("invalid:::address");
				expect(result.server).toBe("invalid:::address");
				expect(result.port).toBeNull();
			});

			it("should handle empty string", () => {
				const result = parseAddress("");
				expect(result.server).toBe("");
				expect(result.port).toBeNull();
			});
		});
	});

	describe("consolidateUpstreams", () => {
		describe("basic consolidation", () => {
			it("should consolidate upstreams with same hostname different ports", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "burger:3000", num_requests: 10, fails: 0 },
					{ address: "burger:8080", num_requests: 20, fails: 1 },
					{ address: "burger:9000", num_requests: 5, fails: 2 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].server).toBe("burger");
				expect(result[0].ports).toEqual([3000, 8080, 9000]);
				expect(result[0].totalRequests).toBe(35);
				expect(result[0].totalFails).toBe(3);
				expect(result[0].upstreams).toHaveLength(3);
			});

			it("should consolidate upstreams with same IP different ports", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "1.1.1.1:80", num_requests: 100, fails: 0 },
					{ address: "1.1.1.1:443", num_requests: 200, fails: 1 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].server).toBe("1.1.1.1");
				expect(result[0].ports).toEqual([80, 443]);
				expect(result[0].totalRequests).toBe(300);
				expect(result[0].totalFails).toBe(1);
			});

			it("should handle hostname with and without port", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "burger", num_requests: 10, fails: 0 },
					{ address: "burger:3000", num_requests: 20, fails: 1 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].server).toBe("burger");
				expect(result[0].ports).toEqual([3000]);
				expect(result[0].totalRequests).toBe(30);
				expect(result[0].totalFails).toBe(1);
			});

			it("should handle IP with and without port", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "1.1.1.1", num_requests: 50, fails: 2 },
					{ address: "1.1.1.1:80", num_requests: 100, fails: 0 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].server).toBe("1.1.1.1");
				expect(result[0].ports).toEqual([80]);
				expect(result[0].totalRequests).toBe(150);
				expect(result[0].totalFails).toBe(2);
			});
		});

		describe("multiple servers", () => {
			it("should keep different servers separate", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server1:3000", num_requests: 10, fails: 0 },
					{ address: "server2:3000", num_requests: 20, fails: 1 },
					{ address: "server3:3000", num_requests: 30, fails: 2 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(3);
				expect(result[0].server).toBe("server1");
				expect(result[1].server).toBe("server2");
				expect(result[2].server).toBe("server3");
			});

			it("should consolidate mixed hostnames and IPs", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "localhost:8080", num_requests: 10, fails: 0 },
					{ address: "localhost:9090", num_requests: 20, fails: 0 },
					{ address: "192.168.1.1:80", num_requests: 30, fails: 1 },
					{ address: "192.168.1.1:443", num_requests: 40, fails: 0 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(2);
				expect(result[0].server).toBe("192.168.1.1");
				expect(result[0].ports).toEqual([80, 443]);
				expect(result[0].totalRequests).toBe(70);
				expect(result[1].server).toBe("localhost");
				expect(result[1].ports).toEqual([8080, 9090]);
				expect(result[1].totalRequests).toBe(30);
			});
		});

		describe("sorting", () => {
			it("should sort servers alphabetically", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "zebra:3000", num_requests: 10, fails: 0 },
					{ address: "apple:3000", num_requests: 20, fails: 0 },
					{ address: "burger:3000", num_requests: 30, fails: 0 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(3);
				expect(result[0].server).toBe("apple");
				expect(result[1].server).toBe("burger");
				expect(result[2].server).toBe("zebra");
			});

			it("should sort ports numerically", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server:9000", num_requests: 10, fails: 0 },
					{ address: "server:80", num_requests: 20, fails: 0 },
					{ address: "server:443", num_requests: 30, fails: 0 },
					{ address: "server:8080", num_requests: 40, fails: 0 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].ports).toEqual([80, 443, 8080, 9000]);
			});

			it("should sort IP addresses", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "192.168.1.2:80", num_requests: 10, fails: 0 },
					{ address: "10.0.0.1:80", num_requests: 20, fails: 0 },
					{ address: "192.168.1.1:80", num_requests: 30, fails: 0 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(3);
				expect(result[0].server).toBe("10.0.0.1");
				expect(result[1].server).toBe("192.168.1.1");
				expect(result[2].server).toBe("192.168.1.2");
			});
		});

		describe("metrics aggregation", () => {
			it("should sum requests across all ports", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server:3000", num_requests: 100, fails: 0 },
					{ address: "server:4000", num_requests: 200, fails: 0 },
					{ address: "server:5000", num_requests: 300, fails: 0 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result[0].totalRequests).toBe(600);
			});

			it("should sum failures across all ports", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server:3000", num_requests: 100, fails: 5 },
					{ address: "server:4000", num_requests: 200, fails: 10 },
					{ address: "server:5000", num_requests: 300, fails: 3 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result[0].totalFails).toBe(18);
			});

			it("should preserve individual upstream data", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server:3000", num_requests: 100, fails: 5 },
					{ address: "server:4000", num_requests: 200, fails: 10 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result[0].upstreams).toHaveLength(2);
				expect(result[0].upstreams[0]).toEqual(upstreams[0]);
				expect(result[0].upstreams[1]).toEqual(upstreams[1]);
			});
		});

		describe("edge cases", () => {
			it("should handle empty array", () => {
				const result = consolidateUpstreams([]);
				expect(result).toEqual([]);
			});

			it("should handle single upstream", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server:3000", num_requests: 100, fails: 5 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].server).toBe("server");
				expect(result[0].ports).toEqual([3000]);
				expect(result[0].totalRequests).toBe(100);
				expect(result[0].totalFails).toBe(5);
			});

			it("should not duplicate ports", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "server:3000", num_requests: 100, fails: 5 },
					{ address: "server:3000", num_requests: 200, fails: 10 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(1);
				expect(result[0].ports).toEqual([3000]);
				expect(result[0].upstreams).toHaveLength(2);
				expect(result[0].totalRequests).toBe(300);
			});
		});

		describe("real-world scenarios", () => {
			it("should handle typical multi-port backend setup", () => {
				const upstreams: CaddyUpstream[] = [
					{ address: "app-server:3000", num_requests: 1000, fails: 2 },
					{ address: "app-server:3001", num_requests: 950, fails: 1 },
					{ address: "app-server:3002", num_requests: 980, fails: 0 },
					{ address: "db-server:5432", num_requests: 500, fails: 0 },
					{ address: "cache-server:6379", num_requests: 2000, fails: 5 },
				];

				const result = consolidateUpstreams(upstreams);

				expect(result).toHaveLength(3);

				// Should be sorted alphabetically
				expect(result[0].server).toBe("app-server");
				expect(result[0].ports).toEqual([3000, 3001, 3002]);
				expect(result[0].totalRequests).toBe(2930);
				expect(result[0].totalFails).toBe(3);

				expect(result[1].server).toBe("cache-server");
				expect(result[1].ports).toEqual([6379]);
				expect(result[1].totalRequests).toBe(2000);
				expect(result[1].totalFails).toBe(5);

				expect(result[2].server).toBe("db-server");
				expect(result[2].ports).toEqual([5432]);
				expect(result[2].totalRequests).toBe(500);
				expect(result[2].totalFails).toBe(0);
			});
		});
	});

	describe("getConfiguredUpstreams", () => {
		it("should extract reverse_proxy addresses from site blocks", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: ["localhost:8080"],
							},
						],
					},
				],
			};

			const result = getConfiguredUpstreams(config);
			expect(result).toEqual(["localhost:8080"]);
		});

		it("should extract multiple upstreams from same reverse_proxy", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: ["localhost:8080", "localhost:8081", "localhost:8082"],
							},
						],
					},
				],
			};

			const result = getConfiguredUpstreams(config);
			expect(result).toEqual([
				"localhost:8080",
				"localhost:8081",
				"localhost:8082",
			]);
		});

		it("should extract from nested directives", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "route",
								args: ["/api/*"],
								block: [
									{
										id: "2",
										name: "reverse_proxy",
										args: ["api-server:3000"],
									},
								],
							},
						],
					},
				],
			};

			const result = getConfiguredUpstreams(config);
			expect(result).toEqual(["api-server:3000"]);
		});

		it("should extract from multiple site blocks", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["site1.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: ["backend1:8080"],
							},
						],
					},
					{
						id: "2",
						addresses: ["site2.com"],
						directives: [
							{
								id: "2",
								name: "reverse_proxy",
								args: ["backend2:9090"],
							},
						],
					},
				],
			};

			const result = getConfiguredUpstreams(config);
			expect(result).toEqual(["backend1:8080", "backend2:9090"]);
		});

		it("should deduplicate addresses", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["site1.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: ["localhost:8080"],
							},
						],
					},
					{
						id: "2",
						addresses: ["site2.com"],
						directives: [
							{
								id: "2",
								name: "reverse_proxy",
								args: ["localhost:8080"],
							},
						],
					},
				],
			};

			const result = getConfiguredUpstreams(config);
			expect(result).toEqual(["localhost:8080"]);
		});

		it("should ignore non-reverse_proxy directives", () => {
			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "file_server",
								args: [],
							},
							{
								id: "2",
								name: "reverse_proxy",
								args: ["localhost:8080"],
							},
							{
								id: "3",
								name: "encode",
								args: ["gzip"],
							},
						],
					},
				],
			};

			const result = getConfiguredUpstreams(config);
			expect(result).toEqual(["localhost:8080"]);
		});
	});

	describe("consolidateUpstreamsWithConfig", () => {
		it("should mark configured upstreams without stats as offline", () => {
			const upstreams: CaddyUpstream[] = [
				{ address: "online-server:8080", num_requests: 100, fails: 0 },
			];

			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: ["online-server:8080", "offline-server:9090"],
							},
						],
					},
				],
			};

			const result = consolidateUpstreamsWithConfig(upstreams, config);

			expect(result).toHaveLength(2);
			expect(result[0].server).toBe("offline-server");
			expect(result[0].isOffline).toBe(true);
			expect(result[0].totalRequests).toBe(0);
			expect(result[0].totalFails).toBe(0);

			expect(result[1].server).toBe("online-server");
			expect(result[1].isOffline).toBeUndefined();
			expect(result[1].totalRequests).toBe(100);
		});

		it("should work without config", () => {
			const upstreams: CaddyUpstream[] = [
				{ address: "server:8080", num_requests: 100, fails: 0 },
			];

			const result = consolidateUpstreamsWithConfig(upstreams, null);

			expect(result).toHaveLength(1);
			expect(result[0].server).toBe("server");
			expect(result[0].isOffline).toBeUndefined();
		});

		it("should consolidate offline upstreams by server", () => {
			const upstreams: CaddyUpstream[] = [];

			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: [
									"offline-server:8080",
									"offline-server:8081",
									"offline-server:8082",
								],
							},
						],
					},
				],
			};

			const result = consolidateUpstreamsWithConfig(upstreams, config);

			expect(result).toHaveLength(1);
			expect(result[0].server).toBe("offline-server");
			expect(result[0].ports).toEqual([8080, 8081, 8082]);
			expect(result[0].isOffline).toBe(true);
		});

		it("should handle mixed online and offline upstreams", () => {
			const upstreams: CaddyUpstream[] = [
				{ address: "server-a:3000", num_requests: 100, fails: 0 },
				{ address: "server-a:3001", num_requests: 150, fails: 1 },
				{ address: "server-b:4000", num_requests: 200, fails: 0 },
			];

			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: [
									"server-a:3000",
									"server-a:3001",
									"server-b:4000",
									"server-c:5000", // This one is offline
								],
							},
						],
					},
				],
			};

			const result = consolidateUpstreamsWithConfig(upstreams, config);

			expect(result).toHaveLength(3);

			// server-a (online)
			const serverA = result.find((s) => s.server === "server-a");
			expect(serverA).toBeDefined();
			expect(serverA?.isOffline).toBeUndefined();
			expect(serverA?.totalRequests).toBe(250);
			expect(serverA?.totalFails).toBe(1);

			// server-b (online)
			const serverB = result.find((s) => s.server === "server-b");
			expect(serverB).toBeDefined();
			expect(serverB?.isOffline).toBeUndefined();
			expect(serverB?.totalRequests).toBe(200);

			// server-c (offline)
			const serverC = result.find((s) => s.server === "server-c");
			expect(serverC).toBeDefined();
			expect(serverC?.isOffline).toBe(true);
			expect(serverC?.totalRequests).toBe(0);
			expect(serverC?.totalFails).toBe(0);
		});

		it("should maintain alphabetical sorting", () => {
			const upstreams: CaddyUpstream[] = [
				{ address: "zebra:8080", num_requests: 100, fails: 0 },
			];

			const config: CaddyConfig = {
				siteBlocks: [
					{
						id: "1",
						addresses: ["example.com"],
						directives: [
							{
								id: "1",
								name: "reverse_proxy",
								args: ["apple:3000", "zebra:8080"],
							},
						],
					},
				],
			};

			const result = consolidateUpstreamsWithConfig(upstreams, config);

			expect(result).toHaveLength(2);
			expect(result[0].server).toBe("apple");
			expect(result[1].server).toBe("zebra");
		});
	});
});
