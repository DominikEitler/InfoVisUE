import os
import datetime
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

path = 'data'
out = '..'
if ('data' not in os.listdir()):
    path = 'preprocessing/data'
    out = '.'

def read_data(file):
    df = pd.read_csv(file)
    df['Date'] = pd.to_datetime(df['Date'])
    df['Date'] = [d if (d.year <= 2020) else d - pd.DateOffset(years=100) for d in df['Date']]    
    df['Station_Number'] = df['Station_Number']
    return df.set_index(['Date', 'Station_Number', 'Depth'])

df_old = read_data(f'{path}/SanFranciscoBayWaterQualityData1969-2015v3.csv')
df_2016 = read_data(f'{path}/2016ver.3.0SanFranciscoBayWaterQualityData.csv')
df_2017 = read_data(f'{path}/2017ver.3.0SanFranciscoBayWaterQualityData.csv')
df_2018 = read_data(f'{path}/2018SanFranciscoBayWaterQualityData.csv')
df_2019 = read_data(f'{path}/2019SanFranciscoBayWaterQualityData.csv')

df = pd.concat([df_old, df_2016, df_2017, df_2018, df_2019])
df = df.reset_index()


df_plt = df.set_index('Date')

df.loc[df['Oxygen'].isna(), 'Oxygen'] = df.loc[df['Oxygen'].isna(), 'Calculated_Oxygen']
df.loc[df['Oxygen'].isna(), 'Oxygen'] = df.loc[df['Oxygen'].isna(), 'Discrete_Oxygen']
df.drop(['Calculated_Oxygen', 'Discrete_Oxygen'], axis=1, inplace=True)

depth = 2.0

df = df[df['Depth'] == depth]

df = df[['Date', 'Station_Number', 'Oxygen']]

df = df.dropna()

start_date = datetime.datetime(1995, 1, 1, 0, 0)

df = df[df['Date'] > start_date]

df['month'] = df['Date'].dt.month
df['year'] = df['Date'].dt.year


df_month = df.groupby(['year', 'month', 'Station_Number']).mean()

coords = {
    657: '38.151667, -121.688333',
    649: '38.060000, -121.800000',
    2: '38.063333, -121.851667',
    3: '38.051667, -121.880000',
    4: '38.048333, -121.935000',
    5: '38.060000, -121.980000',
    6: '38.065000, -122.035000',
    7: '38.048333, -122.096667',
    8: '38.030000, -122.151667',
    9: '38.056667, -122.185000',
    10: '38.060000, -122.208333',
    11: '38.060000, -122.266667',
    12: '38.051667, -122.311667',
    13: '38.028333, -122.370000',
    14: '38.006667, -122.405000',
    15: '37.973333, -122.436667',
    16: '37.916667, -122.446667',
    17: '37.878333, -122.421667',
    18: '37.846667, -122.421667',
    20: '37.820000, -122.393333',
    21: '37.788333, -122.358333',
    22: '37.765000, -122.358333',
    23: '37.728333, -122.336667',
    24: '37.698333, -122.338333',
    25: '37.670000, -122.325000',
    26: '37.636667, -122.313333',
    27: '37.618333, -122.291667',
    28: '37.601667, -122.270000',
    29: '37.580000, -122.245000',
    29.5: '37.568333, -122.218333',
    30: '37.555000, -122.190000',
    31: '37.528333, -122.158333',
    32: '37.518333, -122.133333',
    33: '37.508333, -122.121667',
    34: '37.495000, -122.098333',
    35: '37.480000, -122.078333',
    36: '37.471667, -122.066667',
    662: '38.226667, 121.670000',
    659: '38.178333, 121.666667',
    655: '38.121667, 121.701667',
    654: '38.105000, 121.708333',
    653: '38.105000, 121.720000',
    652: '38.086667, 121.746667',
    651: '38.078333, 121.763333',
    650: '38.071667, 121.775000',
    411: '38.096667, 122.058333',
    407: '38.071667, 122.093333',
    405: '38.048333, 122.123333',
    12.5: '38.040000, 122.315000',
    19: '37.818333, 122.471667',
    28.5: '37.596667, 122.235000'
}

names = {
    657: 'Rio Vista',
    649: 'Sacramento River',
    2: 'Chain Island',
    3: 'Pittsburg',
    4: 'Simmons Point',
    5: 'Middle Ground',
    6: 'Roe Island',
    7: 'Avon Pier',
    8: 'Martinez',
    9: 'Benicia',
    10: 'Crockett',
    11: 'Mare Island',
    12: 'Pinole Shoal',
    13: 'N. of Pinole Point',
    14: '"Echo" Buoy',
    15: 'Point San Pablo',
    16: '"Charlie" Buoy',
    17: 'Raccoon Strait',
    18: 'Point Blunt',
    20: 'Blossom Rock',
    21: 'Bay Bridge',
    22: 'Potrero Point',
    23: 'Hunter\'s Point',
    24: 'Candlestick Point',
    25: 'Oyster Point',
    26: 'San Bruno Shoal',
    27: 'San Francisco Airport',
    28: 'N. of San Mateo Bridge',
    29: 'S. of San Mateo Bridge',
    29.5: 'Steinberger Slough',
    30: 'Redwood Creek',
    31: 'Coyote Hills',
    32: 'Ravenswood Point',
    33: 'Dumbarton Bridge',
    34: 'Newark Slough',
    35: 'Mowry Slough',
    36: 'Calaveras Point',
    662: 'Prospect Isalnd',
    659: 'Old Sac. River',
    655: 'N.of Three Mile Slough',
    654: '',
    653: 'Mid-Decker Island',
    652: 'Towland\'s Landing',
    651: '',
    650: '',
    411: 'Garnet Sill',
    407: 'Reserve Fleet 4',
    405: 'Reserve Fleet 2',
    12.5: 'Pinole Point',
    19: 'Golden Gate',
    28.5: 'Geo Probe'
}

df_month = df_month.reset_index()

lats = [float(coords[number].split(', ')[0]) for number in df_month['Station_Number']]
lngs = [float(coords[number].split(', ')[1]) for number in df_month['Station_Number']]

df_month['Lat'] = lats
df_month['Lng'] = lngs

df_month['Station_Name'] = [names[number] for number in df_month['Station_Number']]

df_month['Oxygen'] = df_month['Oxygen'].round(decimals=4)

df_month.to_csv(f'{out}/oxygen.csv')