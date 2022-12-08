const axios = require('axios');
const config = require('./config.json');
const changes = config.URLS;
const zones = config.ZONES;

let old_ip = undefined;

const periotic = async () => {
	const new_ip = await get_ip();
	if (new_ip !== old_ip) {
		await process.env.BEARER.split(':').forEach(async bearer => {
			let availZones = await get_records(bearer);
			zones.forEach(zone => {
				if (availZones.includes(zone))
					update_records(bearer, zone, old_ip, new_ip);
			});
		});
		old_ip = new_ip;
	}
};

const get_ip = async () => {
	return (await axios({
		url: 'https://ifconfig.me',
		method: 'GET'
	})).data;
}

const get_records = async (bearer) => {
	return axios({
		headers: {
			'Authorization': `Bearer ${bearer}`,
			'Accept-Encoding': 'utf-8'
		},
		url: 'https://api.cloudflare.com/client/v4/zones',
		method: 'GET',
	}).then((res) => {
		return res.data.result.map(zone => zone.id);
	});
}

const update_records = (bearer, zone, old_ip, new_ip) => {
	axios(
		{
			headers: {
				'Authorization': `Bearer ${bearer}`,
				'Accept-Encoding': 'utf-8'
			},
			url: `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records`,
			method: 'GET'
		}).then((res) => {
			res.data.result.forEach(records => {
				/* check if first start, if ipv4 and is one we should change */
				if (changes.includes(records.name) && records.type === 'A' && (records.content === old_ip || old_ip === undefined)) {
					axios({
						headers: { 'Authorization': `Bearer ${bearer}` },
						url: `https://api.cloudflare.com/client/v4/zones/${zone}/dns_records/${records.id}`,
						method: 'PUT',
						data: `{"type":"A","name":"${records.name}","content":"${new_ip}","proxied":${records.proxied}}`
					});
				}
			});
		}
		);
}

setInterval(periotic, 600 * 1000); /* Ten min */
