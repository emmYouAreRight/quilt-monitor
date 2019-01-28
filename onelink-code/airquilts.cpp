TinyApp AirQuilts{
Interface:
    TL_Data LIGHT, TEMP, HUMI, PM25, DISTANCE;
Program:
    int i = 0;
    void setup() {
        TL_Connector.bind(TL_WiFi);
        TL_WiFi.join("inyouzi", "13575756690");
        LIGHT.bind(TL_Light);
        TEMP.bind(TL_Temperature);
        HUMI.bind(TL_Humidity);
        PM25.bind(TL_PM25)
        DISTANCE.bind(TL_Soil_Humidity);
    }
    void loop(){
      TL_Light.read();
      TL_Temperature.read();
      TL_Humidity.read();
      TL_Soil_Humidity.read();
      TL_PM25.read();
    }
}AQ;

TinyApp AirQuiltsPanel@Mobile{
Program:
    TL_Chart ENVIRONMENT_VARIATION_CHART;
    // TL_Chart LIGHT_VARIATION_CHART;
    // TL_Chart TEMPERATURE_VARIATION_CHART;
    // TL_Chart HUMIDITY_VARIATION_CHART;
    // TL_Chart PM25_VARIATION_CHART;
    TL_Chart DISTANCE_VARIATION_CHART;
    void setup(){
      ENVIRONMENT_VARIATION_CHART.bindData(AQ::LIGHT);
      ENVIRONMENT_VARIATION_CHART.bindData(AQ::TEMP);
      ENVIRONMENT_VARIATION_CHART.bindData(AQ::HUMI);
      // TEMPERATURE_VARIATION_CHART.bindData(AQ::TEMP);
      // HUMIDITY_VARIATION_CHART.bindData(AQ::HUMI);
      ENVIRONMENT_VARIATION_CHART.bindData(AQ::PM25);
      DISTANCE_VARIATION_CHART.bindData(AQ::DISTANCE);
      TL_UI.append({ENVIRONMENT_VARIATION_CHART, DISTANCE_VARIATION_CHART});
    }
}CP;
