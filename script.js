
const BOTTLENECK_THRESHOLD = 3;

const sampleTasks = [
    {
        id: 1,
        title: "Create GitHub Repository",
        description: "Set up and organize the project source code.",
        status: "todo",
        priority: "High",
        blocked: false,
        blockedReason: ""
    },
    {
        id: 2,
        title: "Design Kanban Dashboard",
        description: "Create the workflow board and progress indicators.",
        status: "todo",
        priority: "Medium",
        blocked: false,
        blockedReason: ""
    },
    {
        id: 3,
        title: "Build Docker Image",
        description: "Package the application into a container image.",
        status: "progress",
        priority: "High",
        blocked: false,
        blockedReason: ""
    },
    {
        id: 4,
        title: "Configure Jenkins Pipeline",
        description: "Prepare automated build and deployment stages.",
        status: "progress",
        priority: "High",
        blocked: true,
        blockedReason: "Pipeline credentials need to be configured."
    },
    {
        id: 5,
        title: "Prepare Kubernetes Deployment",
        description: "Configure the application deployment and service.",
        status: "progress",
        priority: "Medium",
        blocked: false,
        blockedReason: ""
    },
    {
        id: 6,
        title: "Test Application",
        description: "Verify the dashboard and check its functionality.",
        status: "testing",
        priority: "Medium",
        blocked: false,
        blockedReason: ""
    },
    {
        id: 7,
        title: "Create HTML Page",
        description: "Build the initial webpage structure.",
        status: "done",
        priority: "Low",
        blocked: false,
        blockedReason: ""
    },
    {
        id: 8,
        title: "Install Kubernetes",
        description: "Prepare the local Kubernetes environment.",
        status: "done",
        priority: "Low",
        blocked: false,
        blockedReason: ""
    }
];

// Load saved tasks from browser storage.
function loadSavedTasks(key, fallback) {
    try {
        const saved = localStorage.getItem(key);

        if (saved === null) {
            return fallback.map(task => ({ ...task }));
        }

        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : fallback.map(task => ({ ...task }));
    } catch (error) {
        console.error("Unable to load saved tasks:", error);
        return fallback.map(task => ({ ...task }));
    }
}

let tasks = loadSavedTasks("kanbanTasks", sampleTasks);
let deletedTasks = loadSavedTasks("deletedTasks", []);

function saveTasks() {
    localStorage.setItem("kanbanTasks", JSON.stringify(tasks));
    localStorage.setItem("deletedTasks", JSON.stringify(deletedTasks));
}

const columns = ["todo", "progress", "testing", "done"];

const statusNames = {
    todo: "To Do",
    progress: "In Progress",
    testing: "Testing",
    done: "Done"
};

function getTasksIn(status) {
    return tasks.filter(task => task.status === status);
}

function getTaskProgress(task) {
    const progressByStage = {
        todo: 0,
        progress: 50,
        testing: 80,
        done: 100
    };

    return progressByStage[task.status] ?? 0;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function createButton(text, className, action) {
    const button = createElement("button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
}

// Render a single Kanban task.
function renderTask(task) {
    const card = createElement(
        "article",
        "task" + (task.blocked ? " blocked" : "")
    );

    const title = createElement("h4", "", task.title);

    const description = createElement(
        "p",
        "task-description",
        task.description || ""
    );

    const priority = createElement(
        "span",
        "label " + task.priority.toLowerCase(),
        task.priority + " Priority"
    );

    const progressLabel = createElement(
        "p",
        "task-progress-label",
        "Task progress: " + getTaskProgress(task) + "%"
    );

    const progressTrack = createElement("div", "task-progress-track");
    const progressFill = createElement("div", "task-progress-fill");

    progressFill.style.width = getTaskProgress(task) + "%";
    progressTrack.appendChild(progressFill);

    card.append(title, description, priority, progressLabel, progressTrack);

    if (task.blocked) {
        card.appendChild(
            createElement(
                "div",
                "blocked-reason",
                "⚠ BLOCKED: " + (task.blockedReason || "Needs attention")
            )
        );
    }

    const actions = createElement("div", "task-actions");

    if (task.blocked) {
        actions.appendChild(
            createButton("Resolve Block", "block-btn", () => {
                task.blocked = false;
                task.blockedReason = "";
                renderBoard();
            })
        );
    } else {
        if (task.status !== "done") {
            const nextStatus = columns[columns.indexOf(task.status) + 1];

            actions.appendChild(
                createButton(
                    "Move to " + statusNames[nextStatus],
                    "move-btn",
                    () => {
                        task.status = nextStatus;
                        renderBoard();
                    }
                )
            );
        }

        actions.appendChild(
            createButton("Mark as Blocked", "block-btn", () => {
                const reason = prompt(
                    "Why is this task blocked?",
                    "Waiting for a dependency or approval."
                );

                if (reason === null) return;

                if (!reason.trim()) {
                    alert("Please enter a reason for the blockage.");
                    return;
                }

                task.blocked = true;
                task.blockedReason = reason.trim();
                renderBoard();
            })
        );
    }

    // Delete moves the task to Recently Deleted instead of removing it forever.
    actions.appendChild(
        createButton("Delete Task", "delete-btn", () => {
            const confirmed = confirm(
                'Move "' + task.title + '" to Recently Deleted?'
            );

            if (!confirmed) return;

            const index = tasks.findIndex(item => item.id === task.id);

            if (index === -1) return;

            const removedTask = tasks.splice(index, 1)[0];
            deletedTasks.unshift({ ...removedTask });

            renderBoard();
        })
    );

    card.appendChild(actions);
    return card;
}

// Render tasks in Recently Deleted.
function renderDeletedTasks() {
    const container = document.getElementById("deletedTasksContainer");

    // Avoid errors if the HTML section has not been added yet.
    if (!container) return;

    container.replaceChildren();

    const deletedCount = document.getElementById("deletedCount");

    if (deletedCount) {
        deletedCount.textContent = deletedTasks.length;
    }

    if (deletedTasks.length === 0) {
        container.appendChild(
            createElement(
                "p",
                "empty-column",
                "No deleted tasks. Deleted tasks will appear here."
            )
        );
        return;
    }

    deletedTasks.forEach(task => {
        const card = createElement("article", "task task-card");

        card.appendChild(createElement("h4", "", task.title));

        card.appendChild(
            createElement(
                "p",
                "task-description",
                task.description || "No description provided."
            )
        );

        card.appendChild(
            createElement(
                "p",
                "task-progress-label",
                "Previous column: " + (statusNames[task.status] || task.status)
            )
        );

        card.appendChild(
            createButton("Restore", "restore-btn", () => {
                const alreadyExists = tasks.some(item => item.id === task.id);

                if (!alreadyExists) {
                    tasks.push({ ...task });
                }

                deletedTasks = deletedTasks.filter(
                    item => item.id !== task.id
                );

                renderBoard();
            })
        );

        card.appendChild(
            createButton("Delete Permanently", "permanent-btn", () => {
                const confirmed = confirm(
                    'Permanently delete "' + task.title + '"? This cannot be undone.'
                );

                if (!confirmed) return;

                deletedTasks = deletedTasks.filter(
                    item => item.id !== task.id
                );

                renderBoard();
            })
        );

        container.appendChild(card);
    });
}

// Update the bottleneck monitor.
function updateBottleneckMonitor() {
    const inProgressTasks = getTasksIn("progress");
    const blockedTasks = tasks.filter(task => task.blocked);

    const monitor = document.getElementById("bottleneckMessage");
    const panel = document.getElementById("bottleneckPanel");
    const heading = document.getElementById("bottleneckTitle");

    if (!monitor || !panel || !heading) return;

    const overloadDetected =
        inProgressTasks.length >= BOTTLENECK_THRESHOLD;

    panel.classList.remove("bottleneck-alert");

    if (overloadDetected) {
        panel.classList.add("bottleneck-alert");
        heading.textContent = "⚠ Bottleneck Detected!";

        let message =
            `${inProgressTasks.length} tasks are currently In Progress. ` +
            `The configured limit is ${BOTTLENECK_THRESHOLD}. ` +
            "Review the workload and move finished tasks to Testing.";

        if (blockedTasks.length > 0) {
            message += " Blocked task details: " +
                blockedTasks.map(task =>
                    `${task.title}: ${task.blockedReason}`
                ).join(" | ");
        }

        monitor.textContent = message;
    } else if (blockedTasks.length > 0) {
        panel.classList.add("bottleneck-alert");
        heading.textContent = "⚠ Blocked Task Alert";

        monitor.textContent =
            `${blockedTasks.length} task(s) are blocked: ` +
            blockedTasks.map(task =>
                `${task.title}: ${task.blockedReason}`
            ).join(" | ");
    } else {
        heading.textContent = "✓ Workflow Monitor";

        monitor.textContent =
            `No bottleneck detected. ${inProgressTasks.length} task(s) ` +
            "are In Progress. An overload alert appears when " +
            `${BOTTLENECK_THRESHOLD} or more tasks are In Progress.`;
    }
}

// Update task counts and overall progress.
function updateStatistics() {
    const count = status => getTasksIn(status).length;

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText("totalTasks", tasks.length);
    setText("todoTasks", count("todo"));
    setText("progressTasks", count("progress"));
    setText("completedTasks", count("done"));

    setText("todoCount", count("todo"));
    setText("progressCount", count("progress"));
    setText("testingCount", count("testing"));
    setText("doneCount", count("done"));

    const totalProgress = tasks.reduce(
        (sum, task) => sum + getTaskProgress(task),
        0
    );

    const overallPercent = tasks.length
        ? Math.round(totalProgress / tasks.length)
        : 0;

    setText("overallPercent", overallPercent + "%");

    const overallBar = document.getElementById("overallBar");
    if (overallBar) {
        overallBar.style.width = overallPercent + "%";
    }

    setText(
        "progressSummary",
        `${count("done")} of ${tasks.length} tasks completed. ` +
        "Overall progress is estimated from each task's workflow stage."
    );
}

// Render the full Kanban board and persist the current state.
function renderBoard() {
    columns.forEach(status => {
        const list = document.getElementById(status);
        if (!list) return;

        list.replaceChildren();

        const stageTasks = getTasksIn(status);

        if (stageTasks.length === 0) {
            list.appendChild(
                createElement("p", "empty-column", "No tasks in this stage.")
            );
            return;
        }

        stageTasks.forEach(task => {
            list.appendChild(renderTask(task));
        });
    });

    updateStatistics();
    updateBottleneckMonitor();
    saveTasks();
    renderDeletedTasks();
}

// Add a new task.
const addTaskButton = document.getElementById("addTaskBtn");

if (addTaskButton) {
    addTaskButton.addEventListener("click", () => {
        const title = prompt("Enter the task name:");

        if (title === null || !title.trim()) return;

        const description = prompt("Enter a short task description:");

        if (description === null) return;

        const priorityInput = prompt(
            "Enter priority: High, Medium, or Low",
            "Medium"
        );

        if (priorityInput === null) return;

        const priority = priorityInput.trim().toLowerCase();
        const validPriorities = ["high", "medium", "low"];

        if (!validPriorities.includes(priority)) {
            alert("Priority must be High, Medium, or Low.");
            return;
        }

        const allIds = [...tasks, ...deletedTasks].map(task => Number(task.id) || 0);
        const newId = Math.max(Date.now(), ...allIds) + 1;

        tasks.push({
            id: newId,
            title: title.trim(),
            description: description.trim() || "No description provided.",
            status: "todo",
            priority: priority.charAt(0).toUpperCase() + priority.slice(1),
            blocked: false,
            blockedReason: ""
        });

        renderBoard();
    });
}

// Initial render.
renderBoard();

