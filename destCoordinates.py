import ssl
import pandas as pd

ssl._create_default_https_context = ssl._create_unverified_context

flights_df = pd.read_csv("data/DelayedFlights.csv", usecols=["Dest"])

airports_df = pd.read_csv(
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat",
    header=None,
    na_values="\\N"
)

airports_df = airports_df[[4, 6, 7]]
airports_df.columns = ["IATA", "Latitude", "Longitude"]
airports_df.dropna(subset=["IATA"], inplace=True)

result_df = flights_df.merge(
    airports_df,
    left_on="Dest",
    right_on="IATA",
    how="left"
)

result_df.drop(columns=["IATA"], inplace=True)

result_df.to_csv("data/generatedDestCoordinates.csv", index=False)
print(result_df.head())
