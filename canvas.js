/*constants*/
const canvas = document.querySelector("#canvas")
const ctx = canvas.getContext("2d")
const bounds = canvas.getBoundingClientRect()
const socket = io("https://shared-blackboard.herokuapp.com/")

socket.on("connect", () => {
    console.log(socket.connected) // true
    $(".spins").hide()
})

const players = new Map()

//default options
const lineOptions = {
    lineWidth: 1,
    lineCap: "round",
    strokeStyle: "white",
}

const lineWidthOptions = {
    small: 1,
    med: 5,
    large: 10,
}

//functions
function translatedX(x) {
    var rect = canvas.getBoundingClientRect()
    var factor = canvas.width / rect.width
    return factor * (x - rect.left)
}

function translatedY(y) {
    var rect = canvas.getBoundingClientRect()
    var factor = canvas.width / rect.width
    return factor * (y - rect.top)
}

function resetPlayerPosition() {
    console.log("***RESET***")
    return {
        lastPos: null,
    }
}

function drawLine(position, lastPosition, { lineWidth, lineCap, strokeStyle }) {
    ctx.lineWidth = lineWidthOptions[`${lineWidth}`]
    ctx.lineCap = lineCap
    ctx.strokeStyle = strokeStyle

    ctx.beginPath()
    ctx.moveTo(translatedX(lastPosition.clientX), translatedY(lastPosition.clientY))
    ctx.lineTo(translatedX(position.clientX), translatedY(position.clientY))
    ctx.stroke()
    ctx.closePath()
}

//drawing - need this as as named function for removing listener
const moving = (event) => emitDrawPoints("userDrawing", event)

//start drawing
const emitStartPosition = (event) => {
    canvas.addEventListener("mousemove", moving) //start capturing the user dragging mouse
    emitDrawPoints("userDrawing", event) //emit the current point, prob not needed
}

//a client released the mouse after drawing now done drawing
const emitFinishedPosition = () => {
    canvas.removeEventListener("mousemove", moving, false)
    socket.emit("stopDraw", "")
}

//a client is actively drawing a line with mousedown
const emitDrawPoints = (emitName, event) => {
    const { clientX, clientY } = event
    socket.emit(emitName, { clientX, clientY, ...lineOptions })
}

function getLastPosition(id) {
    return players.get(id)
}

function updateLastPosition(id, pos) {
    players.set(id, pos)
}

/**EVENT LISTENERS */
canvas.addEventListener("mousedown", emitStartPosition)
canvas.addEventListener("mouseup", emitFinishedPosition)
$(".btns").on("click", (e) => {
    lineOptions.strokeStyle = e.target.textContent
})
$(".clearBtn").on("click", (e) => {
    socket.emit("clear", "")
})
$(".type").on("click", (e) => {
    lineOptions.lineCap = e.target.textContent
})
$(".size").on("click", (e) => {
    lineOptions.lineWidth = e.target.textContent
})

/**SOCKET LISTENRS - ie receiving emits from server */

socket.on("addPlayer", (id) => {
    //make player
    updateLastPosition(id, resetPlayerPosition())
})

socket.on("removePlayer", (id) => {
    players.delete(id)
})

//this handles mousedown and mousemove from client - either starting or drawing their line
socket.on("draw", (clientDraw) => {
    const { clientX, clientY, options, id } = clientDraw
    // console.log(options)
    const position = { clientX, clientY }
    const lastPosition = getLastPosition(id) || position
    // console.log(`LAST POSITION-- X: ${lastPosition.x} Y: ${lastPosition.y}`)
    drawLine(position, lastPosition, options)
    updateLastPosition(id, position)
    // console.log(id)
})

//this handles mouseup from client - they are done drawing their line
socket.on("stopDraw", (id) => {
    //clear the clients old x y
    updateLastPosition(id, resetPlayerPosition()) //overwrite
    console.log(players)
})
socket.on("clear", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
})
