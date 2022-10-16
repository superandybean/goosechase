
const express = require('express')
const app = express()

const http = require('http').Server(app)
const io = require('socket.io')(http)

const cookieParser = require('cookie-parser')
app.use(cookieParser())

const crypto = require('crypto')
const axios = require('axios')

const bodyParser = require('body-parser')

const port = process.env.PORT || 3000

app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/public`))
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.json())

const currRooms = new Set()
const userData = {}

function get_url(req, res, next) {
    res.locals.url = req.body.url || "https://www.cmu.edu/"
    console.log(res.locals.url)
    if (res.locals.url === "http://www.cmu.edu/leadership/") {
        res.send({ code: "YOU WIN!"})
        console.log("ENDD")
    }
    next()
}

async function get_html(req, res, next) {
    if (res.locals.url.substring(0, 2) === "//") {
        res.locals.url = 'https://' + res.locals.url.substring(2)
    }
    // if (res.locals.url.substring(res.locals.url.lastIndexOf("/")).includes("index.html")) {
    //     res.locals.url = res.locals.url.substring(0, res.locals.url.lastIndexOf("/")+1)
    // }

    console.log(res.locals.url)
    const result = await axios.get(res.locals.url)
    // console.log(result)
    // console.log(typeof(result))
    // console.log(result.toString())
    let resulting_html = result.data

    if (res.locals.url.substring(res.locals.url.lastIndexOf("/")).includes(".html")) {
        res.locals.url = res.locals.url.substring(0, res.locals.url.lastIndexOf("/")+1)
    }

    // const indexes = [...resulting_html.matchAll(new RegExp("assets", 'gi'))].map(a => a.index)

    let assetInd = resulting_html.indexOf("assets")
    while (assetInd !== -1) {
        // console.log("--------------------")
        // console.log(assetInd)
        // console.log(resulting_html.substring(assetInd-25, assetInd + 25))
        // console.log("NEW")
        if (resulting_html[assetInd-1] !== "/") {
            resulting_html = resulting_html.substring(0, assetInd) + res.locals.url + resulting_html.substring(assetInd)
        }
        // console.log(resulting_html.substring(assetInd-25, assetInd + 25))
        assetInd = resulting_html.indexOf("assets", resulting_html.indexOf("\"", assetInd+6))
    }

    let srcInd = resulting_html.indexOf("src=")
    while (srcInd !== -1) {
        // console.log('--------------')
        // console.log(resulting_html.substring(srcInd, srcInd+50))
        if (!resulting_html.substring(srcInd, srcInd+30).includes("http") && !resulting_html.substring(srcInd, srcInd+30).includes("www") && !resulting_html.substring(srcInd, srcInd+30).includes("+url+")) {
            resulting_html = resulting_html.substring(0, srcInd+5) + res.locals.url + resulting_html.substring(srcInd+5)
            // console.log(resulting_html.substring(srcInd, srcInd+50))
        }
        srcInd = resulting_html.indexOf("src=", srcInd+6)
    }

    let bgUrl = resulting_html.indexOf("background-image:")
    while (bgUrl !== -1) {
        console.log('--------------')
        console.log(resulting_html.substring(bgUrl, bgUrl+150))
        if (!resulting_html.substring(bgUrl, bgUrl+50).includes("http") && !resulting_html.substring(bgUrl, bgUrl+50).includes("none") && !resulting_html.substring(bgUrl, bgUrl+50).includes("www")) {
            // console.log(bgUrl)
            resulting_html = resulting_html.substring(0, resulting_html.indexOf("url(", bgUrl+10)+4) + res.locals.url + resulting_html.substring(resulting_html.indexOf("url(", bgUrl+10)+4)
            console.log(resulting_html.substring(bgUrl, bgUrl+150))
        }
        bgUrl = resulting_html.indexOf("background-image:", resulting_html.indexOf(")", bgUrl+30)+1)
        // console.log(resulting_html.substring(bgUrl, bgUrl+100))
    }

    // console.log("--------------------")
    // console.log(res.locals.url)
    let hrefInd = resulting_html.indexOf("href=")
    while (hrefInd !== -1) {
        // console.log("--------------------")
        // console.log(hrefInd)
        // console.log(resulting_html.substring(hrefInd-50, hrefInd + 50))
        // console.log("NEW")
        if (!resulting_html.substring(hrefInd, hrefInd+20).includes("http") && !resulting_html.substring(hrefInd, hrefInd+20).includes("www") && !resulting_html.substring(hrefInd, hrefInd+20).includes("fonts") && resulting_html.charAt(hrefInd+5) !== "\\" && resulting_html.charAt(hrefInd+6) !== "#") {
            resulting_html = resulting_html.substring(0, hrefInd+6) + res.locals.url + resulting_html.substring(hrefInd+6)
        }

        if (resulting_html.charAt(hrefInd+5) !== "\\" && resulting_html.charAt(hrefInd+6) !== "#") {
            const new_url = resulting_html.substring(hrefInd+6, resulting_html.indexOf("\"", hrefInd+6))
            // console.log(new_url)
            resulting_html = `${resulting_html.substring(0, hrefInd-1)} onclick="changeLink('${new_url}')" ${resulting_html.substring(hrefInd-1)}`
            // console.log(resulting_html.substring(hrefInd-50, hrefInd + 100))
            hrefInd = resulting_html.indexOf("href=", resulting_html.indexOf("<", hrefInd+1))
        }
        else {
            hrefInd = resulting_html.indexOf("href=", hrefInd+36)
        }
    }

    hrefInd = resulting_html.indexOf("href=")
    while (hrefInd !== -1) {
        // console.log(resulting_html.substring(hrefInd, resulting_html.indexOf("\"", hrefInd+6)))
        if (resulting_html.charAt(hrefInd+5) !== "\\" && resulting_html.charAt(hrefInd+6) !== "#" && !(resulting_html.substring(hrefInd, resulting_html.indexOf("\"", hrefInd+6)).includes("css") || resulting_html.substring(hrefInd, resulting_html.indexOf("\"", hrefInd+6)).includes("font"))) {
            // console.log(hrefInd)
            resulting_html = `${resulting_html.substring(0, hrefInd)} ${resulting_html.substring(resulting_html.indexOf("\"", hrefInd+8)+1)}`
            // console.log(resulting_html.substring(hrefInd-50, hrefInd + 100))
            hrefInd = resulting_html.indexOf("href=", resulting_html.indexOf("<", hrefInd+1))
        }
        else {
            hrefInd = resulting_html.indexOf("href=", hrefInd+36)
        }
    }

    let bodyInd = resulting_html.indexOf("</body")
    resulting_html = resulting_html.substring(0, bodyInd) + "<script> async function changeLink(url) { const res = await fetch('/getNewURL', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url }) }); const data = await res.json(); if (data.code === 'YOU WIN!') { parent.winGame() } else { console.log(data); console.log(parent.document.getElementById('HTMLiframe')); parent.document.getElementById('HTMLiframe').srcdoc = data.code; } } </script>" + resulting_html.substring(bodyInd)
    resulting_html = resulting_html.replace(/target="_blank"/g, "")

    res.locals.html_code = resulting_html
    next()
}

function changeName(req, res, next) {
    console.log(req.body.name)
    res.cookie('chocolateChip', req.body.name)
    next()
}

function changeBird(req, res, next) {
    console.log(req.body.bird)
    res.cookie('sugar', req.body.bird)
    next()
}

function checkRoomExists(req, res, next) {
    if (currRooms.has(req.params.room)) {
        next()
    }
    else {
        res.redirect('/')
    }
}

function findData(req, res, next) {
    res.locals.prevPlayers = []
    for (const [key, value] of Object.entries(userData)) {
        if (value === undefined) continue
        // console.log(key, value)
        if (req.params.room === value.roomId) {
            res.locals.prevPlayers.push(JSON.parse(JSON.stringify(value)))
            res.locals.prevPlayers[res.locals.prevPlayers.length-1].id = key
        }
    }
    next()
}

app.get('/', (req, res) => {
  res.render('index')
})

app.post('/getNewURL', [get_url, get_html], (req, res) => {
    res.send({ code: res.locals.html_code })
})

app.post('/changeName', [changeName], (req, res) => {
    res.send()
})

app.post('/changeBird', [changeBird], (req, res) => {
    res.send()
})

app.get('/test', [get_url, get_html], (req, res) => {
    res.render('awesome', { code: res.locals.html_code })
})

app.get('/nameIcon', (req, res) => {
    res.render('nameIcon', { name: req.cookies.chocolateChip, bird: req.cookies.sugar })
})

app.get('/birds', (req, res) => {
    res.render('birds')
})

app.get('/createRoom', (req, res) => {
    var id = crypto.randomBytes(8).toString('hex')
    while (currRooms.has(id)) {
        id = crypto.randomBytes(8).toString('hex')
    }
    currRooms.add(id)
    res.redirect(`/room/${id}`)
})

app.get('/room/:room', [checkRoomExists, findData, get_url, get_html], (req, res) => {
    console.log(res.locals.prevPlayers)
    res.render('readyUp', { prevPlayers: res.locals.prevPlayers, roomId: req.params.room, code: res.locals.html_code })
})

io.on('connection', (socket) => {
  socket.on('room', function(data) {
    // console.log('connection id', socket.id)
    // io.to(data.roomId).emit('playerJoin', { name: data.name || "Anonymous", bird: data.bird || "duoOwl.png", ready: false, id: socket.id} )
    socket.join(data.roomId)
    userData[socket.id] = { name: data.name || "Anonymous", bird: data.bird || "duoOwl.png", roomId: data.roomId, ready: false}
    io.to(data.roomId).emit('playerJoin', { name: data.name || "Anonymous", bird: data.bird || "duoOwl.png", ready: false, id: socket.id} )
    // console.log(io.sockets.adapter.rooms.get(data.roomId))
  })
  socket.on('readyUp', function() {
    let allReady = true
    userData[socket.id].ready = true
    const room = userData[socket.id].roomId
    io.sockets.adapter.rooms.get(room).forEach((id) => {
        if (!userData[id].ready) {
            allReady = false
        }
    })
    io.to(room).emit('readyUp', { id: socket.id })

    if (allReady) {
        io.to(room).emit('startGame')
    }
  })
  socket.on('winGame', function() {
    io.to(userData[socket.id].roomId).emit('endGame')
  })
  socket.on('chat message', function(room, name, msg) {
    console.log(currRooms)
    io.to(room).emit('chat message', name, msg)
  })
  socket.on('disconnecting', function() {
    // console.log("asdf")
    userData[socket.id] = undefined
    socket.rooms.forEach(room => {
      if (io.sockets.adapter.rooms.get(room).size == 1) {
        currRooms.delete(room)
      }
    })
  })
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
