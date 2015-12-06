import serial

ser = serial.Serial('/dev/ttyAMA0')
ser.baudrate = 57600

#data = bytearray([0x80, 0x82, 0x8f])
#ser.write(data)

black = bytearray([0x00] * 28)
white = bytearray([0x7f] * 28)
start = bytearray([0x80, 0x83])
end = bytearray([0x8f])

def fill(address, pattern):
	ser.write(start)
	ser.write(bytearray([address]))
	ser.write(pattern)
	ser.write(end)

fill(0, black)
fill(0, white)
fill(1, black)
fill(1, white)

ser.close()
