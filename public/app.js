new Vue({
  el: '#app',
  data: {
    currentColor: '#000000',
    brushSize: 5,
    currentTool: 'pen',
    canvas: null,
    ctx: null,
    socket: null,
    isDrawing: false,
    lastPoint: null,
    points: [],  // Temporarily store points
  },
  mounted() {
    this.canvas = document.getElementById('whiteboard');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.adjustCanvasSize();
    window.addEventListener('resize', this.adjustCanvasSize);
    this.setupWebSocket();
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseout', this.handleMouseUp);
  },
  methods: {
    setupWebSocket() {
      this.socket = new WebSocket('wss://bobross-9dev.onrender.com/');
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
      };
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          this.redrawCanvas(data.data);
        } else if (data.type === 'draw') {
          if (!data.data.fromServer) {
            this.drawCurve(data.data);
          }
        } else if (data.type === 'clear') {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      };
    },
    adjustCanvasSize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight - this.canvas.offsetTop;
    },
    redrawCanvas(lines) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      lines.forEach(line => {
        line.fromServer = true;
        this.drawCurve(line);
      });
    },
    drawCurve(line) {
      this.ctx.beginPath();
      this.ctx.moveTo(line.points[0].x, line.points[0].y);
      line.points.slice(1).forEach(point => {
        this.ctx.lineTo(point.x, point.y);
      });
    
      // Set color and line width based on the tool
      if (line.tool === 'eraser') {
        this.ctx.globalCompositeOperation = 'destination-out'; // Set to erase
        this.ctx.strokeStyle = 'rgba(0,0,0,1)'; 
      } else {
        this.ctx.globalCompositeOperation = 'source-over'; // Default mode
        this.ctx.strokeStyle = line.color;
      }
    
      this.ctx.lineWidth = line.size;
      this.ctx.stroke();
      this.ctx.closePath();
    },
    
    midPointBtw(p1, p2) {
      return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    },
    handleMouseDown(event) {
      this.isDrawing = true;
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.lastPoint = { x, y };
      this.points = [{ x, y }];
    },
    handleMouseMove(event) {
      if (!this.isDrawing) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.points.push({ x, y });
      this.drawCurve({ points: this.points, color: this.currentColor, size: this.brushSize, tool: this.currentTool });
      this.socket.send(JSON.stringify({
        type: 'draw',
        data: { points: this.points, color: this.currentColor, size: this.brushSize, tool: this.currentTool }
      }));
      this.lastPoint = { x, y };
    },
    handleMouseUp() {
      this.isDrawing = false;
      this.points = [];
      this.ctx.closePath();
    },
    updateColor(event) {
      this.currentColor = event.target.value;
    },
    updateBrushSize(event) {
      this.brushSize = parseInt(event.target.value, 10);
    },
    setTool(tool) {
      this.currentTool = tool;
    },
    clearCanvas() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.socket.send(JSON.stringify({ type: 'clear' }));
    }
  }
});
