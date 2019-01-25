#ifndef ONE_ULTRASONIC_ULTRASONIC_LINKIT_ONE_H
#define ONE_ULTRASONIC_ULTRASONIC_LINKIT_ONE_H

#include <Arduino.h>
#include "TL_Config.h"
#include "Sensor_template.h"


class TL_Ultrasonic
{
	public:
		TL_Ultrasonic(int pin);
		long MeasureInCentimeters(void);
		long MeasureInInches(void);
	private:
		int _pin;//pin number of Arduino that is connected with SIG pin of Ultrasonic Ranger.
};

#endif
