export const projectLimitsByPlan = {
	'None': {
		'messageLimit': 3,
		'crawlLimit': 1,
		'pageLimit': 5,
		'fileLimit': 5,
	},
	'Basic': {
		'messageLimit': 100,
		'crawlLimit': 1,
		'pageLimit': 10,

		'fileLimit': 1,
		'filePageLimit': 10,

	},
	'Starter': {
		'messageLimit': 1000,
		'crawlLimit': 3,
		'pageLimit': 100,

		'fileLimit': 10,
		'filePageLimit': 10,
	},
	'Pro': {
		'messageLimit': 5000,
		'crawlLimit': 10,
		'pageLimit': 10000,

		'fileLimit': 100,
		'filePageLimit': 100,
	}
}

export const numberOfProjectLimitsByPlan = {
	"None": 0,
	"Basic": 1,
	"Starter": 3,
	"Pro": 10
}