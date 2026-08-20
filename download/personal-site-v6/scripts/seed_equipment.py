"""Seed lab equipment with realistic data."""
import sqlite3
from pathlib import Path

DB = Path("/home/z/my-project/db/custom.db")
conn = sqlite3.connect(DB)
cur = conn.cursor()

# Clear existing
cur.execute("DELETE FROM LabEquipment")

equipment = [
    ("vna", "Vector Network Analyzer", "Keysight PNA-X N5247A", "vna", "online",
     "67 GHz, 4 ports, full S-parameters",
     '{"freqRange":"10 MHz - 67 GHz","ports":4,"dynamicRange":129,"ifBandwidthMax":5,"noiseFloor":-111}'),
    ("sa", "Spectrum Analyzer", "Rohde & Schwarz FSW67", "sa", "online",
     "2 Hz - 67 GHz, 2 GHz analysis bandwidth",
     '{"freqRange":"2 Hz - 67 GHz","analysisBandwidth":2,"danl":-160,"toip":30}'),
    ("sg", "Signal Generator", "Keysight E8257D PSG", "sg", "online",
     "250 kHz - 67 GHz, analog & digital modulation",
     '{"freqRange":"250 kHz - 67 GHz","outputPowerMax":25,"phaseNoise":-110,"am":true,"fm":true,"pm":true}'),
    ("osc", "Oscilloscope", "Tektronix MSO64B", "osc", "online",
     "6 GHz, 4 channels, 25 GS/s",
     '{"bandwidth":6,"channels":4,"sampleRate":25,"memoryDepth":250,"triggerModes":["edge","glitch","runt","pulse"]}'),
    ("pm", "Power Meter", "Anritsu ML2495A", "pm", "standby",
     "Up to 65 GHz, peak & average power",
     '{"freqRange":"DC - 65 GHz","dynamicRange":"-70 to +20 dBm","sensorTypes":["CW","Peak","Average"]}'),
    ("fc", "Frequency Counter", "Keysight 53220A", "fc", "standby",
     "350 MHz, 12 digits/sec",
     '{"maxFreq":350,"resolution":12,"channels":2,"reference":"OCXO"}'),
    ("ac", "Anechoic Chamber", "ETS-Lindgren AMS-8500", "ac", "online",
     "1 GHz - 40 GHz, 7m x 4m x 4m",
     '{"sizeW":7,"sizeH":4,"sizeD":4,"freqRange":"1 GHz - 40 GHz","quietZone":2,"absorbers":"pyramidal"}'),
    ("sim", "EM Simulator", "CST Studio Suite 2024", "sim", "online",
     "Time domain, frequency domain, FEM, MoM",
     '{"solvers":["TST","F","FEM","MOM","PIC"],"parallel":64,"gpu":true,"memory":128}'),
    ("ts", "Temp Chamber", "Thermotron SM-32", "ts", "offline",
     "-70 to +180°C, environmental testing",
     '{"tempRange":"-70 to +180","humidity":"20-95%","volume":32}'),
    ("ps", "Power Supply", "Keysight N6705C", "ps", "online",
     "4 channels, 100W total, data logging",
     '{"channels":4,"maxVoltage":20,"maxCurrent":5,"totalPower":100,"logging":true}'),
]

for i, e in enumerate(equipment):
    cur.execute("""
        INSERT INTO LabEquipment (id, name, model, category, status, description, specs, "order", visible, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    """, (e[0], e[1], e[2], e[3], e[4], e[5], e[6], i))

conn.commit()
conn.close()
print(f"✓ Seeded {len(equipment)} lab equipment items")
