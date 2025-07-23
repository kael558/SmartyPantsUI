// index.js - SmartyPantsUI Renderer
// Enhanced logic for project selection, creation, and deployment management

// --- State ---
let projects = [];
let selectedProject = null;
let devServerRunning = false;
let deploymentStages = [];
let abTests = [];
let projectTests = [];
let gitStatus = { branch: "main", changes: 0 };
let githubRepo = "";
let selectedComponents = [];
let isMarkdownMode = false;
let seoQueries = [
	{
		keyword: "react components",
		position: 12,
		change: 3,
		changeDirection: "up",
	},
	{
		keyword: "web development",
		position: 45,
		change: -2,
		changeDirection: "down",
	},
];

// --- DOM Elements ---
const projectsPage = document.getElementById("projects-page");
const uiBarPage = document.getElementById("ui-bar-page");
const createProjectModal = document.getElementById("create-project-modal");
const designGuidelinesModal = document.getElementById(
	"design-guidelines-modal"
);
const addTestModal = document.getElementById("add-test-modal");
const projectsList = document.getElementById("projects-list");
const createProjectTemplateBtn = document.getElementById(
	"create-project-template-btn"
);
const modalCloseBtns = document.querySelectorAll(".close-modal");
const cancelCreateBtn = document.getElementById("cancel-create-btn");
const createProjectBtn = document.getElementById("create-project-btn");
const projectNameInput = document.getElementById("project-name");
// Project path input removed - now uses automatic path generation
const backToProjectsBtn = document.getElementById("back-to-projects-btn");
const currentProjectName = document.getElementById("current-project-name");
const devServerBtn = document.getElementById("dev-server-btn");
const uiBarBtns = document.querySelectorAll(".ui-bar-btn[data-panel]");
const panels = document.querySelectorAll(".panel");
const closePanelBtns = document.querySelectorAll(".close-panel");
const statusMessage = document.getElementById("status-message");
const rolloutRange = document.getElementById("rollout-percentage");
const rolloutValue = document.getElementById("rollout-value");

// Design Guidelines Elements
const designGuidelinesBtn = document.getElementById("design-guidelines-btn");
const designGuidelinesText = document.getElementById("design-guidelines-text");
const cancelDesignBtn = document.getElementById("cancel-design-btn");
const saveDesignBtn = document.getElementById("save-design-btn");

// Test Elements
const addTestBtn = document.getElementById("add-test-btn");
const testNameInput = document.getElementById("test-name");
const testInstructionsInput = document.getElementById("test-instructions");
const cancelTestBtn = document.getElementById("cancel-test-btn");
const saveTestBtn = document.getElementById("save-test-btn");
const testsList = document.getElementById("tests-list");

// Branding Colors Elements
const brandingColorsModal = document.getElementById("branding-colors-modal");
const brandingColorsBtn = document.getElementById("branding-colors-btn");
const primaryColorPicker = document.getElementById("primary-color");
const primaryColorText = document.getElementById("primary-color-text");
const secondaryColorPicker = document.getElementById("secondary-color");
const secondaryColorText = document.getElementById("secondary-color-text");
const tertiaryColorPicker = document.getElementById("tertiary-color");
const tertiaryColorText = document.getElementById("tertiary-color-text");
const cancelBrandingBtn = document.getElementById("cancel-branding-btn");
const saveBrandingBtn = document.getElementById("save-branding-btn");

// Git Elements
const refreshGitBtn = document.getElementById("refresh-git-btn");
const currentBranchName = document.getElementById("current-branch-name");
const gitChangesCount = document.getElementById("git-changes-count");
const addStageBtn = document.getElementById("add-stage-btn");
const addAbTestBtn = document.getElementById("add-ab-test-btn");

// GitHub Repo Elements
const githubRepoInput = document.getElementById("github-repo");
const setupRepoBtn = document.getElementById("setup-repo-btn");
const repoStatus = document.getElementById("repo-status");

// Chat Elements
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");
const chatMessages = document.getElementById("chat-messages");

// SEO Elements
const addSeoQueryModal = document.getElementById("add-seo-query-modal");
const addSeoQueryBtn = document.getElementById("add-seo-query-btn");
const seoKeywordInput = document.getElementById("seo-keyword");
const targetPositionInput = document.getElementById("target-position");
const cancelSeoBtn = document.getElementById("cancel-seo-btn");
const saveSeoBtn = document.getElementById("save-seo-btn");

// --- Utility Functions ---
async function loadProjects() {
	try {
		const response = await window.electronAPI.invoke("load-projects");
		if (response.success) {
			projects = response.data;
		} else {
			showStatus("Failed to load projects: " + response.error);
			projects = [];
		}
	} catch (error) {
		showStatus("Failed to load projects: " + error.message);
		projects = [];
	}
}

function showPage(page) {
	projectsPage.style.display = page === "projects" ? "" : "none";
	uiBarPage.style.display = page === "ui-bar" ? "" : "none";
}

function showStatus(msg) {
	statusMessage.textContent = msg;
}

function clearModal() {
	projectNameInput.value = "";
}

function clearDesignModal() {
	designGuidelinesText.value = "";
}

function clearTestModal() {
	testNameInput.value = "";
	testInstructionsInput.value = "";
}

function clearBrandingModal() {
	primaryColorPicker.value = "#2d67ad";
	primaryColorText.value = "#2d67ad";
	secondaryColorPicker.value = "#e94560";
	secondaryColorText.value = "#e94560";
	tertiaryColorPicker.value = "#16213e";
	tertiaryColorText.value = "#16213e";
}

function renderProjectsList() {
	projectsList.innerHTML = "";
	if (projects.length === 0) {
		projectsList.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects yet. Create your first project above!</p></div>`;
		return;
	}
	projects.forEach((proj, idx) => {
		const card = document.createElement("div");
		card.className = "project-card";
		card.innerHTML = `
			<div class="project-name">${proj.name}</div>
			<div class="project-path">${proj.path}</div>
			<div class="project-actions">
				<button class="action-btn delete-btn" onclick="deleteProject(${idx})">
					<i class="fas fa-trash"></i>
				</button>
			</div>
		`;
		card.onclick = (e) => {
			if (!e.target.closest(".project-actions")) {
				selectProject(idx);
			}
		};
		projectsList.appendChild(card);
	});
}

async function selectProject(idx) {
	selectedProject = projects[idx];
	currentProjectName.textContent = selectedProject.name;

	try {
		const response = await window.electronAPI.invoke(
			"set-project-dir",
			selectedProject.path
		);
		if (response.success) {
			showPage("ui-bar");
			showStatus("Project loaded successfully");
			await loadProjectData();
			await loadGitStatus();
		} else {
			showStatus("Failed to set project directory: " + response.error);
		}
	} catch (error) {
		showStatus("Failed to set project directory: " + error.message);
	}
}

async function loadProjectData() {
	try {
		// Load project data from project_data.json
		const response = await window.electronAPI.invoke(
			"load-project-data",
			selectedProject.path
		);
		if (response.success && response.data) {
			const projectData = response.data;

			// Load design guidelines if they exist
			if (projectData.designGuidelines) {
				designGuidelinesText.value =
					projectData.designGuidelines.guidelines || "";
			}

			// Load branding colors if they exist
			if (projectData.brandingColors) {
				primaryColorPicker.value =
					projectData.brandingColors.primary || "#2d67ad";
				primaryColorText.value =
					projectData.brandingColors.primary || "#2d67ad";
				secondaryColorPicker.value =
					projectData.brandingColors.secondary || "#e94560";
				secondaryColorText.value =
					projectData.brandingColors.secondary || "#e94560";
				tertiaryColorPicker.value =
					projectData.brandingColors.tertiary || "#16213e";
				tertiaryColorText.value =
					projectData.brandingColors.tertiary || "#16213e";
			}

			// Load GitHub repo if it exists
			if (projectData.githubRepo) {
				githubRepo = projectData.githubRepo;
				githubRepoInput.value = githubRepo;
				repoStatus.textContent = `Connected to ${githubRepo}`;
				repoStatus.className = "form-hint success";
			} else {
				githubRepo = "";
				githubRepoInput.value = "";
				repoStatus.textContent = "No repository configured";
				repoStatus.className = "form-hint";
			}

			// Load tests if they exist
			projectTests = projectData.tests || [];

			// Load SEO queries if they exist
			if (projectData.seoQueries) {
				seoQueries = projectData.seoQueries;
			}
		} else {
			// Initialize with default data
			projectTests = [];
			githubRepo = "";
			// Keep default SEO queries if no project data
		}

		// Load stage tracker
		const stageResponse = await window.electronAPI.invoke(
			"load-stage-tracker",
			selectedProject.path
		);
		if (stageResponse.success && stageResponse.data) {
			deploymentStages = stageResponse.data.stages || [];
		} else {
			// Initialize with empty stages - users can create their own
			deploymentStages = [];
			await saveStageTracker();
		}

		updateDeployPanel();
		updateTestsList();
		updateBranchControls();
	} catch (error) {
		showStatus("Failed to load project data: " + error.message);
		projectTests = [];
		deploymentStages = [];
	}
}

async function loadGitStatus() {
	try {
		const response = await window.electronAPI.invoke(
			"get-git-status",
			selectedProject.path
		);
		if (response.success) {
			gitStatus = response.data;
			updateGitDisplay();
		}
	} catch (error) {
		console.error("Failed to load git status:", error);
	}
}

function updateGitDisplay() {
	if (currentBranchName)
		currentBranchName.textContent = gitStatus.branch || "main";
	if (gitChangesCount) gitChangesCount.textContent = gitStatus.changes || 0;
}

async function saveProjectData(additionalData = {}) {
	try {
		const projectData = {
			name: selectedProject.name,
			designGuidelines: {
				guidelines: designGuidelinesText.value,
			},
			tests: projectTests,
			seoQueries: seoQueries,
			lastUpdated: new Date().toISOString(),
			...additionalData, // Merge any additional data
		};

		await window.electronAPI.invoke("save-project-data", {
			path: selectedProject.path,
			data: projectData,
		});
		showStatus("Project data saved successfully");
	} catch (error) {
		showStatus("Failed to save project data: " + error.message);
	}
}

async function saveStageTracker() {
	try {
		const stageData = {
			stages: deploymentStages,
			lastUpdated: new Date().toISOString(),
		};

		await window.electronAPI.invoke("save-stage-tracker", {
			path: selectedProject.path,
			data: stageData,
		});
	} catch (error) {
		showStatus("Failed to save stage tracker: " + error.message);
	}
}

function updateTestsList() {
	testsList.innerHTML = "";
	if (projectTests.length === 0) {
		testsList.innerHTML = `<div class="empty-state"><i class="fas fa-vial"></i><p>No tests configured yet.</p></div>`;
		return;
	}

	projectTests.forEach((test, idx) => {
		const testElement = document.createElement("div");
		testElement.className = "test-item";
		testElement.innerHTML = `
			<div class="test-header">
				<span class="test-name">${test.name}</span>
				<div class="test-status ${test.status || "pending"}">${(
			test.status || "pending"
		).toUpperCase()}</div>
			</div>
			<div class="test-instructions">${test.instructions}</div>
			<div class="test-actions">
				<button class="run-test-btn" onclick="runTest(${idx})">
					<i class="fas fa-play"></i> Run Test
				</button>
				<button class="delete-test-btn" onclick="deleteTest(${idx})">
					<i class="fas fa-trash"></i> Delete
				</button>
			</div>
		`;
		testsList.appendChild(testElement);
	});
}

function updateDeployPanel() {
	const stagesContainer = document.getElementById("deployment-stages");
	const abTestsContainer = document.getElementById("ab-tests-list");
	const stagingEnvSelect = document.getElementById("staging-env");

	if (stagesContainer) {
		stagesContainer.innerHTML = "";
		deploymentStages.forEach((stage, idx) => {
			const stageElement = document.createElement("div");
			stageElement.className = "stage-item";
			stageElement.innerHTML = `
				<div class="stage-info">
					<span class="stage-name">${stage.name}</span>
					<span class="stage-env">${stage.environment} (${stage.branch})</span>
				</div>
				<div class="stage-actions">
					<button class="action-btn" onclick="switchToBranch('${stage.branch}')">
						<i class="fas fa-code-branch"></i>
					</button>
					<div class="stage-status ${stage.active ? "active" : "inactive"}">
						${stage.active ? "Active" : "Inactive"}
					</div>
				</div>
			`;
			stagesContainer.appendChild(stageElement);
		});
	}

	// Update staging environment dropdown
	if (stagingEnvSelect) {
		const currentValue = stagingEnvSelect.value;
		stagingEnvSelect.innerHTML = '<option value="">Select a stage...</option>';

		deploymentStages.forEach((stage) => {
			const option = document.createElement("option");
			option.value = stage.environment;
			option.textContent = stage.name;
			stagingEnvSelect.appendChild(option);
		});

		// Restore previous selection if it still exists
		if (
			currentValue &&
			deploymentStages.find((s) => s.environment === currentValue)
		) {
			stagingEnvSelect.value = currentValue;
		}
	}

	if (abTestsContainer) {
		abTestsContainer.innerHTML = "";
		if (abTests.length === 0) {
			abTestsContainer.innerHTML = `<div class="empty-state"><i class="fas fa-chart-line"></i><p>No A/B tests configured yet.</p></div>`;
		} else {
			abTests.forEach((test) => {
				const testElement = document.createElement("div");
				testElement.className = "ab-test-item";
				testElement.innerHTML = `
					<div class="test-header">
						<span class="test-name">${test.name}</span>
						<button class="edit-test-btn" onclick="editABTest('${test.name}')">
							<i class="fas fa-edit"></i>
						</button>
					</div>
					<div class="test-variants">
						${test.variants
							.map(
								(variant) =>
									`<div class="variant">
								<span class="variant-name">${variant.name}</span>
								<span class="variant-rollout">${variant.rollout}%</span>
							</div>`
							)
							.join("")}
					</div>
				`;
				abTestsContainer.appendChild(testElement);
			});
		}
	}
}

async function deleteProject(idx) {
	if (confirm("Are you sure you want to remove this project?")) {
		try {
			const response = await window.electronAPI.invoke(
				"delete-project",
				projects[idx].path
			);
			if (response.success) {
				projects.splice(idx, 1);
				renderProjectsList();
				showStatus("Project deleted successfully");
			} else {
				showStatus("Failed to delete project: " + response.error);
			}
		} catch (error) {
			showStatus("Failed to delete project: " + error.message);
		}
	}
}

// --- Modal Functions ---
function openCreateProjectModal() {
	createProjectModal.style.display = "flex";
}

function closeCreateProjectModal() {
	createProjectModal.style.display = "none";
	clearModal();
}

function openDesignGuidelinesModal() {
	designGuidelinesModal.style.display = "flex";
}

function closeDesignGuidelinesModal() {
	designGuidelinesModal.style.display = "none";
}

function openAddTestModal() {
	addTestModal.style.display = "flex";
}

function closeAddTestModal() {
	addTestModal.style.display = "none";
	clearTestModal();
}

function openBrandingColorsModal() {
	brandingColorsModal.style.display = "flex";
}

function closeBrandingColorsModal() {
	brandingColorsModal.style.display = "none";
}

// --- Project Functions ---
async function handleCreateProject() {
	const name = projectNameInput.value.trim();
	if (!name) {
		showStatus("Please enter a project name.");
		return;
	}

	if (projects.some((p) => p.name === name)) {
		showStatus("Project with this name already exists.");
		return;
	}

	showStatus("Creating project...");

	try {
		const response = await window.electronAPI.invoke("create-project", {
			name,
		});
		if (response.success) {
			await loadProjects();
			renderProjectsList();
			closeCreateProjectModal();
			showStatus("Project created successfully!");
		} else {
			showStatus("Failed to create project: " + response.error);
		}
	} catch (error) {
		showStatus("Failed to create project: " + error.message);
	}
}

// Browse path functionality removed - now uses automatic path generation

function handleBackToProjects() {
	showPage("projects");
	selectedProject = null;
	if (devServerRunning) {
		handleDevServer();
	}
}

// --- Design Guidelines Functions ---
async function handleSaveDesignGuidelines() {
	try {
		await saveProjectData();
		closeDesignGuidelinesModal();
		showStatus("Design guidelines saved successfully");
	} catch (error) {
		showStatus("Failed to save design guidelines: " + error.message);
	}
}

// --- Branding Colors Functions ---
function syncColorPickers() {
	// Sync color picker with text input
	primaryColorPicker.addEventListener("input", (e) => {
		primaryColorText.value = e.target.value;
	});
	primaryColorText.addEventListener("input", (e) => {
		if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
			primaryColorPicker.value = e.target.value;
		}
	});

	secondaryColorPicker.addEventListener("input", (e) => {
		secondaryColorText.value = e.target.value;
	});
	secondaryColorText.addEventListener("input", (e) => {
		if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
			secondaryColorPicker.value = e.target.value;
		}
	});

	tertiaryColorPicker.addEventListener("input", (e) => {
		tertiaryColorText.value = e.target.value;
	});
	tertiaryColorText.addEventListener("input", (e) => {
		if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
			tertiaryColorPicker.value = e.target.value;
		}
	});
}

async function handleSaveBrandingColors() {
	try {
		const brandingColors = {
			primary: primaryColorText.value,
			secondary: secondaryColorText.value,
			tertiary: tertiaryColorText.value,
		};

		// Save to project data
		await saveProjectData({ brandingColors });
		closeBrandingColorsModal();
		showStatus("Branding colors saved successfully");
	} catch (error) {
		showStatus("Failed to save branding colors: " + error.message);
	}
}

// --- Test Functions ---
async function handleAddTest() {
	const name = testNameInput.value.trim();
	const instructions = testInstructionsInput.value.trim();

	if (!name || !instructions) {
		showStatus("Please fill all fields.");
		return;
	}

	const newTest = {
		id: Date.now().toString(),
		name,
		instructions,
		status: "pending",
		createdAt: new Date().toISOString(),
	};

	projectTests.push(newTest);
	await saveProjectData();
	updateTestsList();
	closeAddTestModal();
	showStatus("Test added successfully");
}

async function runTest(testIdx) {
	const test = projectTests[testIdx];
	if (!test) return;

	showStatus("Running test: " + test.name);
	test.status = "running";
	updateTestsList();

	try {
		const response = await window.electronAPI.invoke("run-playwright-test", {
			projectPath: selectedProject.path,
			testId: test.id,
			testName: test.name,
			instructions: test.instructions,
		});

		if (response.success) {
			test.status = response.data.passed ? "passed" : "failed";
			test.lastRun = new Date().toISOString();
			test.results = response.data.results;
		} else {
			test.status = "failed";
			test.error = response.error;
		}
	} catch (error) {
		test.status = "failed";
		test.error = error.message;
	}

	await saveProjectData();
	updateTestsList();
	showStatus(`Test ${test.status}: ${test.name}`);
}

async function deleteTest(testIdx) {
	if (confirm("Are you sure you want to delete this test?")) {
		projectTests.splice(testIdx, 1);
		await saveProjectData();
		updateTestsList();
		showStatus("Test deleted successfully");
	}
}

// --- Git & Deploy Functions ---
async function setupGitHubRepo() {
	const repo = githubRepoInput.value.trim();
	if (!repo || !repo.includes("/")) {
		showStatus("Please enter a valid repository format: username/repo");
		return;
	}

	try {
		setupRepoBtn.disabled = true;
		setupRepoBtn.innerHTML =
			'<i class="fas fa-spinner fa-spin"></i> Setting up...';
		repoStatus.textContent = "Setting up repository...";
		repoStatus.className = "form-hint";

		// Save the repo to project data
		githubRepo = repo;
		await saveProjectData({ githubRepo });

		// Initialize git repository with remote
		const response = await window.electronAPI.invoke("setup-github-repo", {
			projectPath: selectedProject.path,
			repo: repo,
		});

		if (response.success) {
			repoStatus.textContent = `Connected to ${repo}`;
			repoStatus.className = "form-hint success";
			showStatus("GitHub repository setup successfully!");

			// Enable the stage and A/B test buttons
			updateBranchControls();
			await loadGitStatus();
		} else {
			repoStatus.textContent = `Failed to setup: ${response.error}`;
			repoStatus.className = "form-hint error";
			showStatus("Failed to setup GitHub repository: " + response.error);
		}
	} catch (error) {
		repoStatus.textContent = `Error: ${error.message}`;
		repoStatus.className = "form-hint error";
		showStatus("Error setting up GitHub repository: " + error.message);
	} finally {
		setupRepoBtn.disabled = false;
		setupRepoBtn.innerHTML = '<i class="fas fa-cog"></i> Setup';
	}
}

function updateBranchControls() {
	// Allow stages and A/B tests to work with just local git (no GitHub repo required)
	// This will enable git init automatically when needed
	if (addStageBtn) {
		addStageBtn.disabled = false;
		addStageBtn.title = "Add Stage";
	}

	if (addAbTestBtn) {
		addAbTestBtn.disabled = false;
		addAbTestBtn.title = "Add A/B Test";
	}
}

async function refreshGitStatus() {
	await loadGitStatus();
	showStatus("Git status refreshed");
}

async function switchToBranch(branchName) {
	try {
		showStatus(`Switching to branch: ${branchName}`);
		const response = await window.electronAPI.invoke("switch-git-branch", {
			projectPath: selectedProject.path,
			branch: branchName,
		});

		if (response.success) {
			await loadGitStatus();
			showStatus(`Switched to branch: ${branchName}`);
		} else {
			showStatus("Failed to switch branch: " + response.error);
		}
	} catch (error) {
		showStatus("Failed to switch branch: " + error.message);
	}
}

async function handleDevServer() {
	if (!selectedProject) return;

	if (!devServerRunning) {
		showStatus("Starting development servers...");
		try {
			const response = await window.electronAPI.invoke(
				"start-dev-server",
				selectedProject.path
			);
			if (response.success) {
				devServerRunning = true;
				devServerBtn.classList.add("running");
				devServerBtn.classList.remove("stopped");
				devServerBtn.innerHTML =
					'<i class="fas fa-stop"></i> <span>Stop Local</span>';
				showStatus(
					`Dev servers running - Website: ${response.data.websiteUrl}, API: ${response.data.apiUrl}`
				);
			} else {
				showStatus("Failed to start dev servers: " + response.error);
			}
		} catch (error) {
			showStatus("Failed to start dev servers: " + error.message);
		}
	} else {
		showStatus("Stopping development servers...");
		try {
			const response = await window.electronAPI.invoke(
				"stop-dev-server",
				selectedProject.path
			);
			if (response.success) {
				devServerRunning = false;
				devServerBtn.classList.remove("running");
				devServerBtn.classList.add("stopped");
				devServerBtn.innerHTML =
					'<i class="fas fa-play"></i> <span>Start Local</span>';
				showStatus("Dev servers stopped");
			} else {
				showStatus("Failed to stop dev servers: " + response.error);
			}
		} catch (error) {
			showStatus("Failed to stop dev servers: " + error.message);
		}
	}
}

function handlePanelToggle(e) {
	const btn = e.currentTarget;
	const panelName = btn.getAttribute("data-panel");
	panels.forEach((panel) => {
		panel.style.display = panel.id === panelName + "-panel" ? "" : "none";
	});
	uiBarBtns.forEach((b) => b.classList.remove("active"));
	btn.classList.add("active");

	if (panelName === "deploy") {
		updateDeployPanel();
	} else if (panelName === "tests") {
		updateTestsList();
	} else if (panelName === "seo") {
		updateSeoPanel();
	}
}

function handleClosePanel(e) {
	panels.forEach((panel) => (panel.style.display = "none"));
	uiBarBtns.forEach((b) => b.classList.remove("active"));
}

function handleRolloutChange() {
	rolloutValue.textContent = rolloutRange.value + "%";
}

async function createNewStage() {
	const stageName = prompt("Enter stage name:");
	if (!stageName) return;

	const branch = prompt(
		"Enter git branch name:",
		`stage-${stageName.toLowerCase().replace(/\s+/g, "-")}`
	);
	if (!branch) return;

	try {
		showStatus("Creating stage and branch...");

		// Initialize git if not already done
		await ensureGitInitialized();

		// Create the git branch
		const branchResponse = await window.electronAPI.invoke(
			"switch-git-branch",
			{
				projectPath: selectedProject.path,
				branch: branch,
				createIfNotExists: true,
			}
		);

		if (!branchResponse.success) {
			showStatus("Failed to create branch: " + branchResponse.error);
			return;
		}

		const newStage = {
			name: stageName,
			environment: stageName.toLowerCase().replace(/\s+/g, "-"),
			branch,
			active: false,
			deployUrl: "",
			created: branchResponse.data.created,
		};

		deploymentStages.push(newStage);
		await saveStageTracker();
		updateDeployPanel();

		if (branchResponse.data.created) {
			showStatus(`Stage "${stageName}" created with new branch "${branch}"`);
		} else {
			showStatus(
				`Stage "${stageName}" created using existing branch "${branch}"`
			);
		}
	} catch (error) {
		showStatus("Failed to create stage: " + error.message);
	}
}

async function createNewABTest() {
	const testName = prompt("Enter A/B test name:");
	if (!testName) return;

	const branch = prompt(
		"Enter git branch name for variant:",
		`ab-test-${testName.toLowerCase().replace(/\s+/g, "-")}`
	);
	if (!branch) return;

	const controlRollout = prompt(
		"Enter Control rollout percentage (0-100):",
		"50"
	);
	const variantRollout = prompt(
		"Enter Variant A rollout percentage (0-100):",
		"50"
	);

	try {
		showStatus("Creating A/B test and branch...");

		// Initialize git if not already done
		await ensureGitInitialized();

		// Create the git branch for the variant
		const branchResponse = await window.electronAPI.invoke(
			"switch-git-branch",
			{
				projectPath: selectedProject.path,
				branch: branch,
				createIfNotExists: true,
			}
		);

		if (!branchResponse.success) {
			showStatus("Failed to create branch: " + branchResponse.error);
			return;
		}

		const controlPercent = parseInt(controlRollout) || 50;
		const variantPercent = parseInt(variantRollout) || 50;

		// Normalize percentages to ensure they add up to 100
		const total = controlPercent + variantPercent;
		const normalizedControl =
			total > 0 ? Math.round((controlPercent / total) * 100) : 50;
		const normalizedVariant = 100 - normalizedControl;

		const newTest = {
			name: testName,
			branch: branch,
			created: branchResponse.data.created,
			variants: [
				{
					name: "Control",
					rollout: normalizedControl,
					build: "app",
					branch: "main",
				},
				{
					name: "Variant A",
					rollout: normalizedVariant,
					build: `variant-a-build`,
					branch: branch,
				},
			],
		};

		abTests.push(newTest);
		updateDeployPanel();

		if (branchResponse.data.created) {
			showStatus(`A/B test "${testName}" created with new branch "${branch}"`);
		} else {
			showStatus(
				`A/B test "${testName}" created using existing branch "${branch}"`
			);
		}
	} catch (error) {
		showStatus("Failed to create A/B test: " + error.message);
	}
}

function editABTest(testName) {
	const test = abTests.find((t) => t.name === testName);
	if (test) {
		const variantName = test.variants[1]?.name || "Variant A";
		const currentRollout = test.variants[1]?.rollout || 50;

		const newRollout = prompt(
			`Enter new rollout percentage for ${variantName} (0-100):`,
			currentRollout
		);

		if (newRollout !== null) {
			const rollout = parseInt(newRollout);
			if (rollout >= 0 && rollout <= 100) {
				test.variants[1].rollout = rollout;
				test.variants[0].rollout = 100 - rollout;
				updateDeployPanel();
				showStatus("A/B test updated");
			}
		}
	}
}

async function deployProject() {
	if (!selectedProject) return;

	const stage = document.getElementById("staging-env").value;
	const rolloutPercentage = document.getElementById("rollout-percentage").value;

	showStatus("Deploying project...");

	try {
		// Save A/B config before deployment
		if (abTests.length > 0) {
			await window.electronAPI.invoke("save-ab-config", {
				projectPath: selectedProject.path,
				stage: stage,
				abTests: abTests,
			});
		}

		const response = await window.electronAPI.invoke("deploy-project", {
			projectPath: selectedProject.path,
			stage,
			rolloutPercentage,
		});

		if (response.success) {
			showStatus("Project deployed successfully!");
			const deployLink = document.getElementById("deploy-link");
			const deployLinkAnchor = deployLink.querySelector("a");
			deployLinkAnchor.href = response.data.deployUrl;
			deployLinkAnchor.textContent = response.data.deployUrl;
			deployLink.style.display = "";

			// Update stage tracker
			const stageInfo = deploymentStages.find((s) => s.environment === stage);
			if (stageInfo) {
				stageInfo.active = true;
				stageInfo.deployUrl = response.data.deployUrl;
				stageInfo.lastDeploy = new Date().toISOString();
				await saveStageTracker();
				updateDeployPanel();
			}
		} else {
			showStatus("Failed to deploy project: " + response.error);
		}
	} catch (error) {
		showStatus("Failed to deploy project: " + error.message);
	}
}

// MCP Generation Function
async function generateMCP() {
	if (!selectedProject) return;

	showStatus("Generating MCP...");

	try {
		const response = await window.electronAPI.invoke(
			"generate-mcp",
			selectedProject.path
		);

		if (response.success) {
			showStatus("MCP generated successfully!");

			// Show the generated MCP in a modal or popup
			const mcpContent = JSON.stringify(response.data.mcp, null, 2);

			// Create a simple display modal
			const modal = document.createElement("div");
			modal.className = "modal";
			modal.style.display = "flex";
			modal.innerHTML = `
				<div class="modal-content" style="max-width: 800px;">
					<div class="modal-header">
						<h2><i class="fas fa-code"></i> Generated MCP</h2>
						<button class="close-modal">&times;</button>
					</div>
					<div class="modal-body">
						<p>MCP has been generated and saved to: <strong>${response.data.path}</strong></p>
						<h4>Preview:</h4>
						<pre style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; max-height: 400px;">${mcpContent}</pre>
					</div>
					<div class="modal-footer">
						<button class="create-btn" onclick="copyMCPToClipboard()">Copy to Clipboard</button>
						<button class="cancel-btn" onclick="closeMCPModal()">Close</button>
					</div>
				</div>
			`;

			document.body.appendChild(modal);

			// Store MCP content globally for copying
			window.generatedMCP = mcpContent;

			// Add close functionality
			modal.querySelector(".close-modal").onclick = () => closeMCPModal();
		} else {
			showStatus("Failed to generate MCP: " + response.error);
		}
	} catch (error) {
		showStatus("Failed to generate MCP: " + error.message);
	}
}

// MCP Helper Functions
function copyMCPToClipboard() {
	if (window.generatedMCP) {
		navigator.clipboard
			.writeText(window.generatedMCP)
			.then(() => {
				showStatus("MCP copied to clipboard!");
			})
			.catch((err) => {
				showStatus("Failed to copy MCP to clipboard");
			});
	}
}

function closeMCPModal() {
	const modal = document.querySelector(".modal:last-child");
	if (modal) {
		modal.remove();
	}
}

// Markdown Build Function
async function createMarkdownBuild() {
	if (!selectedProject) return;

	showStatus("Creating markdown build...");

	try {
		const response = await window.electronAPI.invoke(
			"create-markdown-build",
			selectedProject.path
		);

		if (response.success) {
			showStatus("Markdown build created successfully!");
			// Enable the markdown mode toggle after successful build
			const markdownToggle = document.getElementById("markdown-mode-toggle");
			if (markdownToggle) {
				markdownToggle.disabled = false;
			}
		} else {
			showStatus("Failed to create markdown build: " + response.error);
		}
	} catch (error) {
		showStatus("Failed to create markdown build: " + error.message);
	}
}

// Markdown Mode Toggle Function
async function toggleMarkdownMode() {
	const markdownToggle = document.getElementById("markdown-mode-toggle");
	if (!markdownToggle) return;

	const enabled = markdownToggle.checked;

	try {
		showStatus(`${enabled ? "Enabling" : "Disabling"} markdown mode...`);

		const response = await window.electronAPI.invoke(
			"toggle-markdown-mode",
			enabled
		);

		if (response.success) {
			isMarkdownMode = enabled;
			showStatus(response.data.message);

			// Update the label text
			const label = document.querySelector('label[for="markdown-mode-toggle"]');
			if (label) {
				label.innerHTML = `<i class="fas fa-${
					enabled ? "toggle-on" : "toggle-off"
				}"></i> Markdown Mode ${enabled ? "(ON)" : "(OFF)"}`;
			}

			// If dev server is running, restart it in the new mode
			if (devServerRunning) {
				showStatus("Restarting dev server in new mode...");
				await handleDevServer(); // Stop current server
				setTimeout(async () => {
					await handleDevServer(); // Start in new mode
				}, 1000);
			}
		} else {
			showStatus("Failed to toggle markdown mode: " + response.error);
			// Revert the toggle state
			markdownToggle.checked = !enabled;
		}
	} catch (error) {
		showStatus("Failed to toggle markdown mode: " + error.message);
		// Revert the toggle state
		markdownToggle.checked = !enabled;
	}
}

// --- Helper Functions ---
// Ensure git is initialized in the project
async function ensureGitInitialized() {
	try {
		// Try to check git status first
		const statusResponse = await window.electronAPI.invoke(
			"get-git-status",
			selectedProject.path
		);

		if (!statusResponse.success) {
			// Git not initialized, initialize it
			showStatus("Initializing git repository...");
			const initResponse = await window.electronAPI.invoke(
				"setup-github-repo",
				{
					projectPath: selectedProject.path,
					repo: "", // Empty repo will just init git without remote
				}
			);

			if (!initResponse.success) {
				throw new Error("Failed to initialize git repository");
			}
		}
	} catch (error) {
		console.error("Error ensuring git initialization:", error);
		throw error;
	}
}

// --- Chat Functions ---
async function sendChatMessage() {
	const message = chatInput.value.trim();
	if (!message) return;

	// Add user message to chat
	addMessageToChat("user", message);
	chatInput.value = "";

	try {
		showStatus("Processing request...");

		// If we have selected components, use edit-code, otherwise use new-component
		if (selectedComponents.length > 0) {
			// Use the first selected component for editing
			const component = selectedComponents[0];

			const response = await window.electronAPI.invoke("edit-code", {
				input: message,
				path: component.path,
			});

			if (response.success) {
				addMessageToChat("assistant", "✅ Component updated successfully!");
				showStatus("Component updated successfully");

				// Reload the page if dev server is running
				if (devServerRunning) {
					await window.electronAPI.invoke("reload-page", {});
				}
			} else {
				addMessageToChat("assistant", "❌ Error: " + response.error);
				showStatus("Failed to update component: " + response.error);
			}
		} else {
			// Create new component - but we need a target component to add it to
			addMessageToChat(
				"assistant",
				"⚠️ Please select a component first by clicking on it in the preview, or use the component selector in the dev view."
			);
			showStatus("Please select a component first");
		}
	} catch (error) {
		addMessageToChat("assistant", "❌ Error: " + error.message);
		showStatus("Error processing request: " + error.message);
	}
}

function addMessageToChat(sender, content) {
	const messageDiv = document.createElement("div");
	messageDiv.className = `chat-message ${sender}`;

	const timestamp = new Date().toLocaleTimeString();
	messageDiv.innerHTML = `
		<div class="message-content">
			<div class="message-header">
				<span class="sender">${sender === "user" ? "You" : "Assistant"}</span>
				<span class="timestamp">${timestamp}</span>
			</div>
			<div class="message-text">${content}</div>
		</div>
	`;

	chatMessages.appendChild(messageDiv);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- SEO Functions ---
function openAddSeoQueryModal() {
	addSeoQueryModal.style.display = "flex";
}

function closeAddSeoQueryModal() {
	addSeoQueryModal.style.display = "none";
	clearSeoModal();
}

function clearSeoModal() {
	seoKeywordInput.value = "";
	targetPositionInput.value = "";
}

async function handleAddSeoQuery() {
	const keyword = seoKeywordInput.value.trim();
	if (!keyword) {
		showStatus("Please enter a keyword.");
		return;
	}

	const targetPosition =
		parseInt(targetPositionInput.value) || Math.floor(Math.random() * 100) + 1;

	const newQuery = {
		keyword: keyword,
		position: targetPosition,
		change: 0,
		changeDirection: "new",
	};

	seoQueries.push(newQuery);
	updateSeoPanel();
	closeAddSeoQueryModal();
	showStatus("SEO query added successfully");

	// Save to project data
	await saveProjectData({ seoQueries });
}

function deleteSEOQuery(index) {
	if (index >= 0 && index < seoQueries.length) {
		const keyword = seoQueries[index].keyword;
		seoQueries.splice(index, 1);
		updateSeoPanel();
		showStatus(`Removed SEO query: ${keyword}`);

		// Save to project data
		saveProjectData({ seoQueries });
	}
}

function updateSeoPanel() {
	const rankingsContainer = document.getElementById("seo-rankings");
	if (!rankingsContainer) return;

	if (seoQueries.length === 0) {
		rankingsContainer.innerHTML =
			'<div class="empty-state"><i class="fas fa-search"></i><p>No SEO queries configured yet.</p></div>';
		return;
	}

	rankingsContainer.innerHTML = seoQueries
		.map(
			(query, index) => `
		<div class="ranking-item">
			<span class="keyword">${query.keyword}</span>
			<div class="ranking-position">#${query.position}</div>
			<div class="ranking-change ${query.changeDirection}">
				${
					query.changeDirection === "new"
						? "NEW"
						: query.changeDirection === "up"
						? `+${query.change}`
						: query.changeDirection === "down"
						? `${query.change}`
						: ""
				}
			</div>
			<button class="delete-query-btn" onclick="deleteSEOQuery(${index})">
				<i class="fas fa-times"></i>
			</button>
		</div>
	`
		)
		.join("");
}

// Global functions for onclick handlers
window.deleteProject = deleteProject;
window.runTest = runTest;
window.deleteTest = deleteTest;
window.switchToBranch = switchToBranch;
window.createNewStage = createNewStage;
window.createNewABTest = createNewABTest;
window.editABTest = editABTest;
window.deployProject = deployProject;
window.generateMCP = generateMCP;
window.copyMCPToClipboard = copyMCPToClipboard;
window.closeMCPModal = closeMCPModal;
window.createMarkdownBuild = createMarkdownBuild;
window.removeSelectedComponent = removeSelectedComponent;
window.toggleMarkdownMode = toggleMarkdownMode;
window.deleteSEOQuery = deleteSEOQuery;

// --- Component Selection Functions ---
function updateComponentsCounter() {
	const counter = document.getElementById("components-selected");
	if (counter) {
		counter.textContent = selectedComponents.length;
	}
}

function addSelectedComponent(component) {
	// Check if component is already selected
	const exists = selectedComponents.find((c) => c.path === component.path);
	if (!exists) {
		selectedComponents.push(component);
		updateComponentsCounter();
		updateSelectedComponentsDisplay();
	}
}

function removeSelectedComponent(path) {
	selectedComponents = selectedComponents.filter((c) => c.path !== path);
	updateComponentsCounter();
	updateSelectedComponentsDisplay();
}

function updateSelectedComponentsDisplay() {
	// Create or update a display area for selected components
	let selectedComponentsArea = document.getElementById(
		"selected-components-area"
	);
	if (!selectedComponentsArea) {
		// Create the area if it doesn't exist
		const chatControls = document.querySelector(".chat-controls");
		if (chatControls) {
			selectedComponentsArea = document.createElement("div");
			selectedComponentsArea.id = "selected-components-area";
			selectedComponentsArea.className = "selected-components-area";
			selectedComponentsArea.innerHTML =
				'<h4><i class="fas fa-puzzle-piece"></i> Selected Components</h4><div id="selected-components-list" class="selected-components-list"></div>';
			chatControls.appendChild(selectedComponentsArea);
		}
	}

	const listElement = document.getElementById("selected-components-list");
	if (listElement) {
		if (selectedComponents.length === 0) {
			listElement.innerHTML =
				'<div class="empty-state">No components selected</div>';
		} else {
			listElement.innerHTML = selectedComponents
				.map(
					(component, idx) => `
				<div class="selected-component-item">
					<div class="component-info">
						<i class="fas fa-file-code"></i>
						<span class="component-path">${component.relativePath || component.path}</span>
						${
							component.exists
								? '<span class="status-indicator success">✓</span>'
								: '<span class="status-indicator error">✗</span>'
						}
					</div>
					<button class="remove-component-btn" onclick="removeSelectedComponent('${
						component.path
					}')">
						<i class="fas fa-times"></i>
					</button>
				</div>
			`
				)
				.join("");
		}
	}
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", async () => {
	await loadProjects();
	renderProjectsList();
	showPage("projects");

	// Set up electron event listeners for component selection
	if (window.electron && window.electron.receiveEvent) {
		window.electron.receiveEvent("component-selected", (event, data) => {
			console.log("Component selected:", data);
			if (data.exists) {
				addSelectedComponent(data);
				showStatus(`Component selected: ${data.relativePath || data.path}`);
			} else {
				showStatus(`Component not found: ${data.error}`);
			}
		});

		window.electron.receiveEvent("set-initial-values", (event, data) => {
			console.log("Received initial values:", data);
			// Handle initial setup if needed
		});

		window.electron.receiveEvent("components", (event, components) => {
			console.log("Available components:", components);
			// Could be used to show available components in the UI
		});
	}

	// Project modal events
	createProjectTemplateBtn.onclick = openCreateProjectModal;
	cancelCreateBtn.onclick = closeCreateProjectModal;
	createProjectBtn.onclick = handleCreateProject;
	// Browse path button removed - now uses automatic path generation

	// Design guidelines events
	designGuidelinesBtn.onclick = openDesignGuidelinesModal;
	cancelDesignBtn.onclick = closeDesignGuidelinesModal;
	saveDesignBtn.onclick = handleSaveDesignGuidelines;

	// Test events
	addTestBtn.onclick = openAddTestModal;
	cancelTestBtn.onclick = closeAddTestModal;
	saveTestBtn.onclick = handleAddTest;

	// Branding colors events
	brandingColorsBtn.onclick = openBrandingColorsModal;
	cancelBrandingBtn.onclick = closeBrandingColorsModal;
	saveBrandingBtn.onclick = handleSaveBrandingColors;

	// Initialize color picker sync
	syncColorPickers();

	// Git events
	if (refreshGitBtn) refreshGitBtn.onclick = refreshGitStatus;
	if (addStageBtn) addStageBtn.onclick = createNewStage;
	if (addAbTestBtn) addAbTestBtn.onclick = createNewABTest;

	// GitHub repo events
	if (setupRepoBtn) setupRepoBtn.onclick = setupGitHubRepo;

	// New AI Panel events
	const generateMcpBtn = document.getElementById("generate-mcp-btn");
	if (generateMcpBtn) generateMcpBtn.onclick = generateMCP;

	// Add markdown build button and toggle to AI panel if needed
	const aiPanel = document.getElementById("ai-panel");
	if (aiPanel) {
		const generateBtn = aiPanel.querySelector("#generate-mcp-btn");
		if (generateBtn) {
			// Add markdown build button after MCP button
			const markdownBtn = document.createElement("button");
			markdownBtn.className = "generate-btn";
			markdownBtn.innerHTML =
				'<i class="fas fa-file-markdown"></i> Create Markdown Build';
			markdownBtn.onclick = createMarkdownBuild;
			generateBtn.parentNode.insertBefore(markdownBtn, generateBtn.nextSibling);

			// Add markdown mode toggle after markdown build button
			const toggleContainer = document.createElement("div");
			toggleContainer.className = "toggle-container";
			toggleContainer.style.cssText =
				"margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background: #f9f9f9;";

			const toggleWrapper = document.createElement("div");
			toggleWrapper.style.cssText =
				"display: flex; align-items: center; gap: 10px;";

			const toggle = document.createElement("input");
			toggle.type = "checkbox";
			toggle.id = "markdown-mode-toggle";
			toggle.disabled = true; // Disabled until markdown build is created
			toggle.onchange = toggleMarkdownMode;
			toggle.style.cssText = "transform: scale(1.2);";

			const label = document.createElement("label");
			label.htmlFor = "markdown-mode-toggle";
			label.innerHTML = '<i class="fas fa-toggle-off"></i> Markdown Mode (OFF)';
			label.style.cssText = "cursor: pointer; font-weight: bold;";

			const helpText = document.createElement("small");
			helpText.textContent = "Create markdown build first to enable this mode";
			helpText.style.cssText = "display: block; color: #666; margin-top: 5px;";

			toggleWrapper.appendChild(toggle);
			toggleWrapper.appendChild(label);
			toggleContainer.appendChild(toggleWrapper);
			toggleContainer.appendChild(helpText);

			markdownBtn.parentNode.insertBefore(
				toggleContainer,
				markdownBtn.nextSibling
			);
		}
	}

	// Modal close events
	modalCloseBtns.forEach((btn) => {
		btn.onclick = (e) => {
			const modal = e.target.closest(".modal");
			if (modal) modal.style.display = "none";
		};
	});

	// UI events
	backToProjectsBtn.onclick = handleBackToProjects;
	devServerBtn.onclick = handleDevServer;
	uiBarBtns.forEach((btn) => (btn.onclick = handlePanelToggle));
	closePanelBtns.forEach((btn) => (btn.onclick = handleClosePanel));
	rolloutRange.oninput = handleRolloutChange;

	// Deploy button handler
	const deployBtn = document.getElementById("deploy-btn");
	if (deployBtn) {
		deployBtn.onclick = deployProject;
	}

	// Chat events
	if (sendChatBtn) {
		sendChatBtn.onclick = sendChatMessage;
	}
	if (chatInput) {
		chatInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				sendChatMessage();
			}
		});
	}

	// SEO events
	if (addSeoQueryBtn) addSeoQueryBtn.onclick = openAddSeoQueryModal;
	if (cancelSeoBtn) cancelSeoBtn.onclick = closeAddSeoQueryModal;
	if (saveSeoBtn) saveSeoBtn.onclick = handleAddSeoQuery;
});
